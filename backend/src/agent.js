// Mirrors the Daml MilestoneStatus ordering (deriving Ord).
export const MILESTONE_ORDER = ['Pending', 'Shipped', 'Delivered', 'Confirmed'];
const rank = (milestone) => MILESTONE_ORDER.indexOf(milestone);

// How many of the agreement's remaining tranches an attested milestone
// unlocks, in order. Same rule the Daml choice enforces, checked here first
// so the agent never submits a release the ledger would reject.
export function tranchesUnlocked(agreement, milestone) {
  const releasedCount = Number(agreement.releasedCount);
  let unlocked = 0;
  for (const tranche of agreement.tranches.slice(releasedCount)) {
    if (rank(milestone) < rank(tranche.milestone)) break;
    unlocked += 1;
  }
  return unlocked;
}

const MAX_ATTEMPTS = 3;

// The seller's agent. Watches for oracle attestations visible to the
// seller and releases every tranche they unlock. Also settles an agreement
// when the buyer's payment arrives. All decisions go to the activity log.
export class SellerAgent {
  constructor({ ledger, issuerLedger, templates, log, pollMs }) {
    this.ledger = ledger; // LedgerClient acting as the seller
    this.issuerLedger = issuerLedger; // used only to simulate the buyer's payment arriving
    this.templates = templates;
    this.log = log;
    this.pollMs = pollMs;
    this.handled = new Set(); // attestation contract ids already processed
    this.attempts = new Map(); // attestation contract id -> failed attempts
    this.busy = false;
    this.timer = null;
  }

  start() {
    this.log.record('agent', 'started', `Watching for milestone attestations every ${this.pollMs} ms`);
    this.timer = setInterval(() => this.tick(), this.pollMs);
    return this.tick();
  }

  stop() {
    clearInterval(this.timer);
  }

  // One polling pass. Runs serially so two passes never race to release the
  // same tranche.
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const attestations = await this.ledger.query(this.templates.MilestoneAttestation);
      const fresh = attestations
        .filter((a) => !this.handled.has(a.contractId))
        .sort((a, b) => a.payload.attestedAt.localeCompare(b.payload.attestedAt));
      for (const attestation of fresh) await this.#process(attestation);
    } catch (err) {
      this.log.record('agent', 'poll_failed', `Could not read the ledger: ${err.message}`, {}, 'error');
    } finally {
      this.busy = false;
    }
  }

  async #process(attestation) {
    const { contractId } = attestation;
    try {
      await this.handleAttestation(attestation);
      this.handled.add(contractId);
    } catch (err) {
      const attempts = (this.attempts.get(contractId) ?? 0) + 1;
      this.attempts.set(contractId, attempts);
      const giveUp = attempts >= MAX_ATTEMPTS;
      if (giveUp) this.handled.add(contractId);
      this.log.record('agent', 'release_failed',
        `Release for ${attestation.payload.invoiceId} failed (attempt ${attempts}/${MAX_ATTEMPTS}${giveUp ? ', giving up' : ', will retry'}): ${err.message}`,
        { attestationCid: contractId }, 'error');
    }
  }

  async handleAttestation(attestation) {
    const { invoiceId, milestone } = attestation.payload;
    const agreements = await this.ledger.query(this.templates.FundingAgreement, { invoiceId });
    if (agreements.length === 0) {
      this.log.record('agent', 'no_agreement', `${milestone} attested for ${invoiceId}, but it has no active funding agreement`, { invoiceId, milestone });
      return;
    }

    for (const agreement of agreements) {
      const terms = agreement.payload;
      const unlocked = tranchesUnlocked(terms, milestone);
      if (unlocked === 0) {
        const next = terms.tranches[Number(terms.releasedCount)];
        const reason = next ? `next tranche needs ${next.milestone}` : 'all tranches already released';
        this.log.record('agent', 'no_release', `${milestone} for ${invoiceId} unlocks nothing: ${reason}`, { invoiceId, milestone });
        continue;
      }

      let agreementCid = agreement.contractId;
      for (let i = 0; i < unlocked; i += 1) {
        const trancheIndex = Number(terms.releasedCount) + i;
        const result = await this.ledger.exercise(this.templates.FundingAgreement, agreementCid,
          'FundingAgreement_ReleaseTranche', { attestationCid: attestation.contractId });
        agreementCid = result._1;
        const [paid, updated] = await Promise.all([
          this.ledger.fetch(this.templates.CashHolding, result._2),
          this.ledger.fetch(this.templates.FundingAgreement, agreementCid),
        ]);
        this.log.record('agent', 'tranche_released',
          `Released tranche ${trancheIndex + 1}/${terms.tranches.length} for ${invoiceId}: ${paid.payload.amount} ${paid.payload.currency} to seller on ${milestone}`,
          {
            invoiceId,
            milestone,
            tranche: trancheIndex + 1,
            amount: paid.payload.amount,
            currency: paid.payload.currency,
            feeAccrued: updated.payload.feeAccrued,
            agreementCid,
          });
      }
    }
  }

  // The buyer pays the invoice off-ledger; here the cash issuer credits the
  // seller to simulate it arriving as stablecoin. The agent then splits off
  // exactly principal + fee in a private transaction and settles.
  async settleOnBuyerPayment(invoiceId) {
    const [agreement] = await this.ledger.query(this.templates.FundingAgreement, { invoiceId });
    if (!agreement) throw new Error(`No active funding agreement for ${invoiceId}`);
    const terms = agreement.payload;
    if (Number(terms.releasedCount) === 0) throw new Error(`Nothing has been advanced on ${invoiceId} yet`);

    const payment = await this.issuerLedger.create(this.templates.CashHolding, {
      issuer: terms.cashIssuer,
      owner: terms.seller,
      currency: terms.currency,
      amount: terms.faceValue,
      observers: [],
    });
    this.log.record('agent', 'buyer_paid', `Buyer paid ${terms.faceValue} ${terms.currency} for ${invoiceId}`, { invoiceId });

    // Decimal strings from the ledger; add in cents to avoid float drift.
    const dueCents = Math.round(Number(terms.releasedTotal) * 100) + Math.round(Number(terms.feeAccrued) * 100);
    const repaymentDue = (dueCents / 100).toFixed(2);
    const split = await this.ledger.exercise(this.templates.CashHolding, payment.contractId, 'Holding_Split', { splitAmount: repaymentDue });
    const repaid = await this.ledger.exercise(this.templates.FundingAgreement, agreement.contractId,
      'FundingAgreement_Settle', { repaymentCid: split._1 });

    this.log.record('agent', 'settled',
      `Settled ${invoiceId}: repaid ${repaymentDue} ${terms.currency} (principal ${terms.releasedTotal} + fee ${terms.feeAccrued}) to lender`,
      { invoiceId, repaymentDue, principal: terms.releasedTotal, fee: terms.feeAccrued, lenderHoldingCid: repaid });
    return { invoiceId, repaymentDue, principal: terms.releasedTotal, fee: terms.feeAccrued };
  }
}
