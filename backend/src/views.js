// What one party can see on the ledger, shaped for the dashboard's
// split-screen. Every list comes from a query made *as that party*, so the
// privacy guarantees are the ledger's, not this code's.
export async function partyView(ledger, templates) {
  const q = (template) => ledger.query(template);
  const [details, invoices, proposals, agreements, cash, attestations] = await Promise.all([
    q(templates.InvoiceDetails),
    q(templates.InvoiceAsset),
    q(templates.FundingProposal),
    q(templates.FundingAgreement),
    q(templates.CashHolding),
    q(templates.MilestoneAttestation),
  ]);

  const owned = cash.filter((c) => c.payload.owner === ledger.party);
  const balanceCents = owned.reduce((sum, c) => sum + Math.round(Number(c.payload.amount) * 100), 0);

  return {
    party: ledger.party,
    balance: (balanceCents / 100).toFixed(2),
    invoiceDetails: details.map((c) => ({ contractId: c.contractId, ...c.payload })),
    invoices: invoices.map((c) => ({ contractId: c.contractId, ...c.payload })),
    proposals: proposals.map((c) => ({ contractId: c.contractId, ...c.payload })),
    agreements: agreements.map((c) => ({ contractId: c.contractId, ...c.payload })),
    cashHoldings: cash.map((c) => ({ contractId: c.contractId, ...c.payload })),
    attestations: attestations.map((c) => ({ contractId: c.contractId, ...c.payload })),
  };
}
