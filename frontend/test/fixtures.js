// Party views shaped like GET /api/view/:role responses for one deal.
export const P = {
  seller: 'Seller::1220aa',
  lender: 'Lender::1220bb',
  oracle: 'LogisticsOracle::1220cc',
  outsider: 'Outsider::1220dd',
  issuer: 'CashIssuer::1220ee',
};
export const ID = 'INV-2026-0091';

const empty = (party) => ({
  party, balance: '0.00', invoiceDetails: [], invoices: [], proposals: [], agreements: [], cashHoldings: [], attestations: [],
});
const tranches = [{ milestone: 'Shipped', fraction: '0.6' }, { milestone: 'Delivered', fraction: '0.3' }];
const cash = (contractId, owner, amount, observers = []) => ({ contractId, issuer: P.issuer, owner, currency: 'USD', amount, observers });
const attestation = (milestone, at) => ({
  contractId: `att-${milestone}`, oracle: P.oracle, seller: P.seller, invoiceId: ID, milestone, evidenceHash: `sha256:${milestone}`, attestedAt: at,
});

// released: 0, 1 or 2 tranches; settled: agreement archived and repaid.
export function views({ released = 0, settled = false } = {}) {
  const v = { seller: empty(P.seller), lender: empty(P.lender), oracle: empty(P.oracle), outsider: empty(P.outsider) };
  v.seller.invoiceDetails.push({ contractId: 'det', seller: P.seller, invoiceId: ID, buyerRef: 'BUYER-REF-1', lineItems: [] });

  const atts = [attestation('Shipped', '2026-10-07T01:00:00Z'), attestation('Delivered', '2026-10-07T02:00:00Z')].slice(0, settled ? 2 : released);
  v.seller.attestations.push(...atts);
  v.oracle.attestations.push(...atts);

  const paid = [60000, 30000].slice(0, settled ? 2 : released);
  paid.forEach((amount, i) => v.seller.cashHoldings.push(cash(`paid-${i}`, P.seller, `${amount}.0`)));
  if (settled) {
    v.lender.cashHoldings.push(cash('free', P.lender, '910000.0'), cash('repaid', P.lender, '91799.94'));
    return v;
  }

  const escrowLeft = 90000 - paid.reduce((a, b) => a + b, 0);
  const agreement = {
    contractId: 'agr', seller: P.seller, lender: P.lender, oracle: P.oracle, invoiceId: ID, faceValue: '100000.0',
    tranches, discountRate: '0.12', cashIssuer: P.issuer, currency: 'USD', dueDate: '2026-12-06T00:00:00Z',
    advanceAmount: '90000.0', escrowCid: escrowLeft > 0 ? 'escrow' : null, releasedCount: String(released),
    releasedTotal: `${90000 - escrowLeft}.0`, feeAccrued: ['0.0', '1199.96', '1799.94'][released],
  };
  v.seller.invoices.push({
    contractId: 'inv', seller: P.seller, invoiceId: ID, faceValue: '100000.0', dueDate: agreement.dueDate,
    milestone: ['Pending', 'Shipped', 'Delivered'][released], financed: released > 0,
  });
  v.seller.agreements.push(agreement);
  v.lender.agreements.push(agreement);
  v.lender.cashHoldings.push(cash('free', P.lender, '910000.0'));
  if (escrowLeft > 0) {
    const escrow = cash('escrow', P.lender, `${escrowLeft}.0`, [P.seller]);
    v.seller.cashHoldings.push(escrow);
    v.lender.cashHoldings.push(escrow);
  }
  return v;
}

export const lastAgreement = () => views({ released: 2 }).seller.agreements[0];
