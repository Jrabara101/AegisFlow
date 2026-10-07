const DAY_MS = 24 * 60 * 60 * 1000;

// Default terms for a demo deal; same shape as daml/Init.daml.
export const DEFAULT_TERMS = {
  faceValue: 100000,
  tranches: [
    { milestone: 'Shipped', fraction: 0.6 },
    { milestone: 'Delivered', fraction: 0.3 },
  ],
  discountRate: 0.12,
  dueInDays: 60,
  currency: 'USD',
};

const LENDER_TOP_UP = 1000000;

// Next free id after the highest INV-<year>-<n> the seller holds.
export function nextInvoiceId(existingIds, year = new Date().getUTCFullYear()) {
  const prefix = `INV-${year}-`;
  const highest = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter(Number.isInteger)
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
}

const cents = (n) => Math.round(Number(n) * 100);

// Opens a fresh funded deal on the running ledger, doing what each party
// would do on its own node: the seller tokenizes an invoice and proposes
// financing, the lender pre-splits exactly the advance and accepts. Lets the
// dashboard restart the demo without restarting the ledger.
export class DealDesk {
  constructor({ ledgers, parties, templates, log }) {
    this.ledgers = ledgers; // seller, lender, issuer LedgerClients
    this.parties = parties;
    this.templates = templates;
    this.log = log;
  }

  async open(terms = DEFAULT_TERMS) {
    const { seller, lender, issuer } = this.ledgers;
    const t = this.templates;
    const advanceCents = terms.tranches.reduce((sum, tr) => sum + Math.round(terms.faceValue * tr.fraction * 100), 0);
    const advance = (advanceCents / 100).toFixed(2);

    const details = await seller.query(t.InvoiceDetails);
    const invoiceId = nextInvoiceId(details.map((d) => d.payload.invoiceId));

    await seller.create(t.InvoiceDetails, {
      seller: seller.party,
      invoiceId,
      buyerRef: `BUYER-REF-${Math.floor(10000 + Math.random() * 90000)}`,
      lineItems: ['200x industrial valves', 'Freight and insurance'],
    });
    const invoice = await seller.create(t.InvoiceAsset, {
      seller: seller.party,
      invoiceId,
      faceValue: String(terms.faceValue),
      dueDate: new Date(Date.now() + terms.dueInDays * DAY_MS).toISOString(),
      milestone: 'Pending',
      financed: false,
    });

    const escrowCid = await this.#escrow(advance, advanceCents, terms.currency);

    const proposalCid = await seller.exercise(t.InvoiceAsset, invoice.contractId, 'InvoiceAsset_ProposeFinancing', {
      lender: lender.party,
      oracle: this.parties.oracle,
      tranches: terms.tranches.map((tr) => ({ milestone: tr.milestone, fraction: String(tr.fraction) })),
      discountRate: String(terms.discountRate),
      cashIssuer: issuer.party,
      currency: terms.currency,
    });
    const agreementCid = await lender.exercise(t.FundingProposal, proposalCid, 'FundingProposal_Accept', { escrowCid });

    this.log.record('agent', 'deal_opened',
      `Opened ${invoiceId}: ${terms.faceValue} ${terms.currency} invoice, ${advance} escrowed by the lender`,
      { invoiceId, advance, agreementCid });
    return { invoiceId, advance, agreementCid };
  }

  // Splits exactly the advance off a free lender holding, topping the lender
  // up from the cash issuer first if no holding is big enough.
  async #escrow(advance, advanceCents, currency) {
    const { lender, issuer } = this.ledgers;
    const t = this.templates;
    const free = (await lender.query(t.CashHolding))
      .filter((c) => c.payload.owner === lender.party && c.payload.observers.length === 0
        && c.payload.currency === currency && c.payload.issuer === issuer.party)
      .sort((a, b) => cents(b.payload.amount) - cents(a.payload.amount));

    let source = free[0];
    if (!source || cents(source.payload.amount) < advanceCents) {
      source = await issuer.create(t.CashHolding, {
        issuer: issuer.party,
        owner: lender.party,
        currency,
        amount: String(LENDER_TOP_UP),
        observers: [],
      });
    }
    const split = await lender.exercise(t.CashHolding, source.contractId, 'Holding_Split', { splitAmount: advance });
    return split._1;
  }
}
