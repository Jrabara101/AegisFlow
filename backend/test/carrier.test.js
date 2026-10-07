import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockCarrier, CARRIER_STATUSES, signPayload } from '../src/carrier.js';
import { quietLog } from './helpers.js';

function carrierWithRecorder() {
  const sent = [];
  const fetchImpl = async (url, { headers, body }) => {
    sent.push({ url, signature: headers['X-Carrier-Signature'], body });
    return { ok: true, status: 201, json: async () => ({}) };
  };
  const carrier = new MockCarrier({ webhookUrl: 'http://oracle/webhook', secret: 's', log: quietLog(), fetchImpl });
  return { carrier, sent };
}

test('advances through every status, signing each webhook, then stops', async () => {
  const { carrier, sent } = carrierWithRecorder();
  for (const status of CARRIER_STATUSES) {
    await carrier.advance('INV-1');
    assert.equal(carrier.status('INV-1').status, status);
  }
  await assert.rejects(carrier.advance('INV-1'), /already receipt_confirmed/);
  assert.equal(sent.length, CARRIER_STATUSES.length);
  for (const { body, signature } of sent) assert.equal(signature, signPayload(body, 's'));
  assert.equal(new Set(sent.map((s) => JSON.parse(s.body).eventId)).size, sent.length);
});

test('replay re-sends the identical event', async () => {
  const { carrier, sent } = carrierWithRecorder();
  await assert.rejects(carrier.replay('INV-1'), /No webhook/);
  await carrier.advance('INV-1');
  await carrier.replay('INV-1');
  assert.equal(sent[0].body, sent[1].body);
});

test('forge sends a wrongly signed delivery without moving the shipment', async () => {
  const { carrier, sent } = carrierWithRecorder();
  await carrier.forge('INV-1');
  assert.equal(carrier.status('INV-1').status, 'not_shipped');
  assert.equal(JSON.parse(sent[0].body).status, 'delivered');
  assert.notEqual(sent[0].signature, signPayload(sent[0].body, 's'));
});
