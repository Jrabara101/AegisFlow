import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DealDesk, nextInvoiceId } from '../src/deals.js';
import { quietLog, templates, types } from './helpers.js';

test('nextInvoiceId continues after the highest id for the year', () => {
  assert.equal(nextInvoiceId([], 2026), 'INV-2026-0001');
  assert.equal(nextInvoiceId(['INV-2026-0091', 'INV-2026-0007', 'INV-2025-0500', 'OTHER'], 2026), 'INV-2026-0092');
});

// Records every command; returns canned results shaped like the JSON API.
function fakeLedger(party, { holdings = [] } = {}) {
  const calls = [];
  let n = 0;
  return {
    party,
    calls,
    async query(templateId) {
      if (templateId === templates.CashHolding) return holdings;
      return [];
    },
    async create(templateId, payload) {
      calls.push({ op: 'create', templateId, payload });
      return { contractId: `${party}-c${++n}`, payload };
    },
    async exercise(templateId, contractId, choice, argument) {
      calls.push({ op: 'exercise', templateId, contractId, choice, argument });
      if (choice === 'Holding_Split') return { _1: `${party}-split`, _2: null };
      return `${party}-r${++n}`;
    },
  };
}

function desk(lenderHoldings) {
  const ledgers = {
    seller: fakeLedger('Seller'),
    lender: fakeLedger('Lender', { holdings: lenderHoldings }),
    issuer: fakeLedger('Issuer'),
  };
  const log = quietLog();
  return { ledgers, log, desk: new DealDesk({ ledgers, parties: { oracle: 'Oracle' }, templates, log }) };
}

const holding = (contractId, amount, observers = []) => ({
  contractId,
  payload: { issuer: 'Issuer', owner: 'Lender', currency: 'USD', amount, observers },
});

test('opens a deal by escrowing exactly the advance from a free holding', async () => {
  const { ledgers, log, desk: d } = desk([holding('escrowed', '500000.0', ['Seller']), holding('free', '910000.0')]);
  const deal = await d.open();
  assert.equal(deal.invoiceId.endsWith('-0001'), true);
  assert.equal(deal.advance, '90000.00');

  const split = ledgers.lender.calls.find((c) => c.choice === 'Holding_Split');
  assert.equal(split.contractId, 'free');
  assert.equal(split.argument.splitAmount, '90000.00');
  const accept = ledgers.lender.calls.find((c) => c.choice === 'FundingProposal_Accept');
  assert.equal(accept.argument.escrowCid, 'Lender-split');
  assert.equal(ledgers.issuer.calls.length, 0);
  assert.deepEqual(types(log), ['deal_opened']);
});

test('tops the lender up when no free holding covers the advance', async () => {
  const { ledgers, desk: d } = desk([holding('small', '1000.0')]);
  await d.open();
  assert.equal(ledgers.issuer.calls[0].payload.owner, 'Lender');
  const split = ledgers.lender.calls.find((c) => c.choice === 'Holding_Split');
  assert.equal(split.contractId, 'Issuer-c1');
});
