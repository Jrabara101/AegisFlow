import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveDeal, availableActions, invoiceIds, cashOf } from '../src/lib/deal.js';
import { views, lastAgreement, ID } from './fixtures.js';

test('a freshly funded deal is at step 0 with the full advance in escrow', () => {
  const deal = deriveDeal({ invoiceId: ID, views: views() });
  assert.equal(deal.status, 'active');
  assert.equal(deal.step, 0);
  assert.equal(deal.escrow, 90000);
  assert.equal(deal.tranches.length, 2);
  assert.equal(deal.tranches[0].next, true);
  assert.deepEqual(availableActions(deal), { ship: true, deliver: false, pay: false, replay: false, attack: true });
});

test('after the first tranche the step is Shipped and the attestation is linked', () => {
  const deal = deriveDeal({ invoiceId: ID, views: views({ released: 1 }), shipment: { status: 'in_transit' } });
  assert.equal(deal.step, 1);
  assert.equal(deal.escrow, 30000);
  assert.equal(deal.tranches[0].attestation.evidenceHash, 'sha256:Shipped');
  assert.equal(deal.tranches[1].attestation, null);
  assert.equal(deal.awaitingAgent, false);
  assert.equal(availableActions(deal).deliver, true);
});

test('flags the agent as busy while a reached milestone is not yet released', () => {
  const deal = deriveDeal({ invoiceId: ID, views: views({ released: 1 }), shipment: { status: 'delivered' } });
  assert.equal(deal.awaitingAgent, true);
  assert.equal(availableActions(deal).pay, false);
});

test('repayment due is principal plus the fee the ledger accrued', () => {
  const deal = deriveDeal({ invoiceId: ID, views: views({ released: 2 }), shipment: { status: 'delivered' } });
  assert.equal(deal.step, 2);
  assert.equal(deal.repaymentDue, 91799.94);
  assert.equal(deal.escrow, 0);
  assert.equal(availableActions(deal).pay, true);
});

test('a settled deal reads its numbers from the settlement event', () => {
  const activity = [{ type: 'settled', data: { invoiceId: ID, principal: '90000.0', fee: '1799.94', repaymentDue: '91799.94' } }];
  const deal = deriveDeal({ invoiceId: ID, views: views({ settled: true }), activity });
  assert.equal(deal.status, 'settled');
  assert.equal(deal.step, 3);
  assert.deepEqual(deal.settlement, { principal: 90000, fee: 1799.94, repaid: 91799.94 });
  assert.equal(availableActions(deal).ship, false);
});

test('without the event, a settled deal falls back to the last agreement seen', () => {
  const deal = deriveDeal({ invoiceId: ID, views: views({ settled: true }), remembered: lastAgreement() });
  assert.equal(deal.settlement.repaid, 91799.94);
  assert.equal(deal.faceValue, 100000);
});

test('after a reload, a settled deal rebuilds its terms from the settlement event', () => {
  const terms = { ...lastAgreement() };
  const activity = [{ type: 'settled', data: { invoiceId: ID, principal: '90000.0', fee: '1799.94', repaymentDue: '91799.94', terms } }];
  const deal = deriveDeal({ invoiceId: ID, views: views({ settled: true }), activity });
  assert.equal(deal.faceValue, 100000);
  assert.equal(deal.tranches.length, 2);
  assert.equal(deal.tranches.every((t) => t.released), true);
});

test('lists invoices newest first and splits free from escrowed cash', () => {
  const v = views();
  v.seller.invoiceDetails.push({ invoiceId: 'INV-2026-0092' }, { invoiceId: 'INV-2026-0010' });
  assert.deepEqual(invoiceIds(v.seller), ['INV-2026-0092', 'INV-2026-0091', 'INV-2026-0010']);
  assert.deepEqual(cashOf(v.lender), { total: 1000000, free: 910000, locked: 90000 });
});
