import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveDeal } from '../src/lib/deal.js';
import { visibilityMatrix, contextFor, contractsVisible } from '../src/lib/visibility.js';
import { views, ID } from './fixtures.js';

const matrixAt = (opts) => {
  const v = views(opts);
  const deal = deriveDeal({ invoiceId: ID, views: v });
  return Object.fromEntries(visibilityMatrix(v, contextFor(v, deal)).map((r) => [r.key, r.cells]));
};

test('buyer data stays on the seller node only', () => {
  const m = matrixAt({ released: 1 });
  assert.deepEqual(m.buyer, { seller: true, lender: false, oracle: false, outsider: false });
});

test('both deal parties see terms and escrow; the oracle sees only its proofs', () => {
  const m = matrixAt({ released: 1 });
  assert.deepEqual(m.terms, { seller: true, lender: true, oracle: false, outsider: false });
  assert.deepEqual(m.escrow, { seller: true, lender: true, oracle: false, outsider: false });
  assert.deepEqual(m.shipment, { seller: true, lender: false, oracle: true, outsider: false });
  assert.deepEqual(m.lenderCash, { seller: false, lender: true, oracle: false, outsider: false });
});

test('the outsider sees nothing at any stage', () => {
  for (const opts of [{}, { released: 2 }, { settled: true }]) {
    const v = views(opts);
    assert.equal(contractsVisible(v.outsider, ID), 0);
    for (const cells of Object.values(matrixAt(opts))) assert.equal(cells.outsider, false);
  }
});
