import { num, sumAmounts } from './format.js';

// Mirrors the Daml MilestoneStatus ordering.
export const MILESTONES = ['Pending', 'Shipped', 'Delivered', 'Confirmed'];
export const rank = (milestone) => MILESTONES.indexOf(milestone);

export const STEPS = ['Funded', 'Shipped', 'Delivered', 'Settled'];

// Carrier status -> milestone the oracle attests for it.
export const SHIPMENT_MILESTONE = { in_transit: 'Shipped', delivered: 'Delivered', receipt_confirmed: 'Confirmed' };

const forInvoice = (list = [], invoiceId) => list.filter((c) => c.invoiceId === invoiceId);

// Every invoice the seller has tokenized, newest first (ids are zero-padded).
export function invoiceIds(sellerView) {
  if (!sellerView) return [];
  return [...new Set(sellerView.invoiceDetails.map((d) => d.invoiceId))].sort().reverse();
}

// Cash a party owns, split into free funds and funds it has disclosed to a
// counterparty (escrow locked inside a funding agreement).
export function cashOf(view) {
  const owned = view.cashHoldings.filter((c) => c.owner === view.party);
  return {
    total: sumAmounts(owned.map((c) => c.amount)),
    free: sumAmounts(owned.filter((c) => c.observers.length === 0).map((c) => c.amount)),
    locked: sumAmounts(owned.filter((c) => c.observers.length > 0).map((c) => c.amount)),
  };
}

// The attestation that unlocks a tranche: an exact milestone match, or any
// later milestone (the ledger accepts attestation.milestone >= tranche's).
function attestationFor(attestations, milestone) {
  return attestations.find((a) => a.milestone === milestone)
    ?? attestations.find((a) => rank(a.milestone) > rank(milestone))
    ?? null;
}

// One deal as the seller's node sees it, plus what the activity log knows
// about its settlement. `remembered` is the last agreement this dashboard
// saw, because settling archives the agreement and its numbers with it.
export function deriveDeal({ invoiceId, views, shipment = null, activity = [], remembered = null }) {
  const seller = views.seller;
  const details = forInvoice(seller.invoiceDetails, invoiceId)[0] ?? null;
  const invoice = forInvoice(seller.invoices, invoiceId)[0] ?? null;
  const proposal = forInvoice(seller.proposals, invoiceId)[0] ?? null;
  const live = forInvoice(seller.agreements, invoiceId)[0] ?? null;
  const settledEvent = activity.findLast((e) => e.type === 'settled' && e.data?.invoiceId === invoiceId) ?? null;
  const agreement = live ?? remembered ?? settledEvent?.data.terms ?? null;

  let status = 'unfunded';
  if (live) status = 'active';
  else if (proposal) status = 'proposed';
  else if (!invoice) status = 'settled'; // Settle archives the invoice and the agreement.

  const terms = agreement ?? proposal;
  const faceValue = num(terms?.faceValue ?? invoice?.faceValue);
  const releasedCount = num(agreement?.releasedCount);
  const attestations = forInvoice(seller.attestations, invoiceId)
    .sort((a, b) => a.attestedAt.localeCompare(b.attestedAt));

  const tranches = (terms?.tranches ?? []).map((t, index) => ({
    index,
    milestone: t.milestone,
    fraction: num(t.fraction),
    amount: faceValue * num(t.fraction),
    released: index < releasedCount,
    next: status === 'active' && index === releasedCount,
    attestation: attestationFor(attestations, t.milestone),
  }));

  let step = 0;
  if (status === 'settled') step = 3;
  else if (releasedCount > 0) step = Math.min(2, Math.max(1, rank(tranches[releasedCount - 1].milestone)));

  const escrowCid = live?.escrowCid ?? null;
  const escrowHolding = escrowCid ? seller.cashHoldings.find((c) => c.contractId === escrowCid) : null;
  const releasedTotal = num(agreement?.releasedTotal);
  const feeAccrued = num(agreement?.feeAccrued);

  const settlement = settledEvent
    ? { principal: num(settledEvent.data.principal), fee: num(settledEvent.data.fee), repaid: num(settledEvent.data.repaymentDue) }
    : status === 'settled' && agreement
      ? { principal: releasedTotal, fee: feeAccrued, repaid: sumAmounts([releasedTotal, feeAccrued]) }
      : null;

  const shipmentMilestone = SHIPMENT_MILESTONE[shipment?.status] ?? 'Pending';
  const awaitingAgent = status === 'active'
    && tranches.some((t) => !t.released && rank(t.milestone) <= rank(shipmentMilestone));

  return {
    invoiceId,
    status,
    step,
    details,
    invoice,
    agreementCid: live?.contractId ?? null,
    faceValue,
    advanceAmount: num(agreement?.advanceAmount) || tranches.reduce((s, t) => s + t.amount, 0),
    discountRate: num(terms?.discountRate),
    dueDate: terms?.dueDate ?? invoice?.dueDate ?? null,
    currency: terms?.currency ?? 'USD',
    tranches,
    releasedCount,
    releasedTotal,
    feeAccrued,
    repaymentDue: sumAmounts([releasedTotal, feeAccrued]),
    escrowCid,
    escrow: num(escrowHolding?.amount),
    attestations,
    settlement,
    shipmentStatus: shipment?.status ?? 'not_shipped',
    awaitingAgent,
  };
}

// Which demo buttons make sense right now.
export function availableActions(deal) {
  const active = deal?.status === 'active';
  const shipping = deal?.shipmentStatus ?? 'not_shipped';
  return {
    ship: active && shipping === 'not_shipped',
    deliver: active && shipping === 'in_transit',
    pay: active && deal.releasedCount > 0 && !deal.awaitingAgent,
    replay: active && shipping !== 'not_shipped',
    attack: active,
  };
}
