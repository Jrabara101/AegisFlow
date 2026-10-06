import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LogisticsOracle, evidenceHash } from '../src/oracle.js';
import { signPayload } from '../src/carrier.js';
import { quietLog, templates, types } from './helpers.js';

const SECRET = 'test-secret';

function fakeLedger({ fail = false } = {}) {
  return {
    party: 'Oracle::1',
    created: [],
    async create(templateId, payload) {
      if (fail) throw new Error('ledger down');
      this.created.push({ templateId, payload });
      return { contractId: `att-${this.created.length}` };
    },
  };
}

function setup(ledgerOptions) {
  const ledger = fakeLedger(ledgerOptions);
  const log = quietLog();
  const oracle = new LogisticsOracle({ ledger, templates, seller: 'Seller::1', secret: SECRET, log });
  return { ledger, log, oracle };
}

function webhook(overrides = {}) {
  const body = JSON.stringify({
    eventId: 'evt-1',
    invoiceId: 'INV-1',
    status: 'in_transit',
    occurredAt: '2026-10-06T00:00:00Z',
    document: { kind: 'bill_of_lading', reference: 'TRK-1-0' },
    ...overrides,
  });
  return [body, signPayload(body, SECRET)];
}

test('attests a correctly signed webhook as the mapped milestone', async () => {
  const { ledger, oracle } = setup();
  const [body, sig] = webhook();
  const res = await oracle.handleWebhook(body, sig);
  assert.equal(res.status, 201);
  assert.equal(ledger.created.length, 1);
  const { templateId, payload } = ledger.created[0];
  assert.equal(templateId, templates.MilestoneAttestation);
  assert.deepEqual(payload, {
    oracle: 'Oracle::1',
    seller: 'Seller::1',
    invoiceId: 'INV-1',
    milestone: 'Shipped',
    evidenceHash: evidenceHash({ kind: 'bill_of_lading', reference: 'TRK-1-0' }),
    attestedAt: '2026-10-06T00:00:00Z',
  });
});

test('rejects missing, malformed and wrong signatures without touching the ledger', async () => {
  const { ledger, log, oracle } = setup();
  const [body] = webhook();
  for (const sig of [undefined, 'not-hex', signPayload(body, 'wrong-secret')]) {
    assert.equal((await oracle.handleWebhook(body, sig)).status, 401);
  }
  assert.equal(ledger.created.length, 0);
  assert.deepEqual(types(log), ['webhook_rejected', 'webhook_rejected', 'webhook_rejected']);
});

test('rejects a body altered after signing', async () => {
  const { ledger, oracle } = setup();
  const [, sig] = webhook();
  const [tampered] = webhook({ status: 'delivered' });
  assert.equal((await oracle.handleWebhook(tampered, sig)).status, 401);
  assert.equal(ledger.created.length, 0);
});

test('ignores a retried webhook with the same eventId', async () => {
  const { ledger, oracle } = setup();
  const [body, sig] = webhook();
  await oracle.handleWebhook(body, sig);
  const res = await oracle.handleWebhook(body, sig);
  assert.deepEqual(res, { status: 200, body: { duplicate: true } });
  assert.equal(ledger.created.length, 1);
});

test('concurrent duplicates produce a single attestation', async () => {
  const { ledger, oracle } = setup();
  const [body, sig] = webhook();
  const results = await Promise.all([oracle.handleWebhook(body, sig), oracle.handleWebhook(body, sig)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
  assert.equal(ledger.created.length, 1);
});

test('does not attest statuses that are not milestones', async () => {
  const { ledger, oracle } = setup();
  const [body, sig] = webhook({ status: 'out_for_delivery' });
  assert.equal((await oracle.handleWebhook(body, sig)).status, 202);
  assert.equal(ledger.created.length, 0);
});

test('a failed ledger call can be retried with the same eventId', async () => {
  const failing = setup({ fail: true });
  const [body, sig] = webhook();
  assert.equal((await failing.oracle.handleWebhook(body, sig)).status, 502);
  assert.equal(failing.oracle.seenEvents.has('evt-1'), false);
});
