// What each party's node can see, worked out from the contracts the ledger
// returned to that party. Nothing here decides visibility: if a row says
// "hidden", the party's own query came back without it.

const has = (list, invoiceId) => list.some((c) => c.invoiceId === invoiceId);

export const ROLES = ['seller', 'lender', 'oracle', 'outsider'];

export const ROLE_LABEL = { seller: 'Seller', lender: 'Lender', oracle: 'Oracle', outsider: 'Outsider' };

// ctx: { invoiceId, escrowCid, parties: { seller, lender } }
export const DATA_ROWS = [
  { key: 'buyer', label: 'Buyer & line items', icon: 'buyer', sees: (v, c) => has(v.invoiceDetails, c.invoiceId) },
  {
    key: 'invoice', label: 'Invoice value', icon: 'invoice',
    sees: (v, c) => has(v.invoices, c.invoiceId) || has(v.proposals, c.invoiceId) || has(v.agreements, c.invoiceId),
  },
  { key: 'terms', label: 'Funding terms', icon: 'terms', sees: (v, c) => has(v.agreements, c.invoiceId) || has(v.proposals, c.invoiceId) },
  { key: 'shipment', label: 'Shipment proofs', icon: 'seal', sees: (v, c) => has(v.attestations, c.invoiceId) },
  { key: 'escrow', label: 'Escrowed advance', icon: 'vault', sees: (v, c) => Boolean(c.escrowCid) && v.cashHoldings.some((h) => h.contractId === c.escrowCid) },
  { key: 'sellerCash', label: "Seller's balance", icon: 'cash', sees: (v, c) => v.cashHoldings.some((h) => h.owner === c.parties.seller) },
  {
    key: 'lenderCash', label: "Lender's other funds", icon: 'bank',
    sees: (v, c) => v.cashHoldings.some((h) => h.owner === c.parties.lender && h.observers.length === 0),
  },
];

// The four chips on each party card.
export const CHIPS = [
  { key: 'buyer', label: 'Buyer', icon: 'buyer', sees: DATA_ROWS[0].sees },
  { key: 'terms', label: 'Terms', icon: 'terms', sees: DATA_ROWS[2].sees },
  { key: 'shipment', label: 'Shipment', icon: 'truck', sees: DATA_ROWS[3].sees },
  { key: 'cash', label: 'Cash', icon: 'cash', sees: (v) => v.cashHoldings.length > 0 },
];

export function contextFor(views, deal) {
  return {
    invoiceId: deal?.invoiceId,
    escrowCid: deal?.escrowCid ?? null,
    parties: { seller: views.seller.party, lender: views.lender.party },
  };
}

export function visibilityMatrix(views, ctx) {
  return DATA_ROWS.map((row) => ({
    ...row,
    cells: Object.fromEntries(ROLES.map((role) => [role, views[role] ? row.sees(views[role], ctx) : false])),
  }));
}

// Contracts about this deal (plus cash) that the party's node holds.
export function contractsVisible(view, invoiceId) {
  const about = (list) => list.filter((c) => c.invoiceId === invoiceId).length;
  return about(view.invoiceDetails) + about(view.invoices) + about(view.proposals)
    + about(view.agreements) + about(view.attestations) + view.cashHoldings.length;
}
