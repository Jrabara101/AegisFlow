import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SellerAgent, tranchesUnlocked } from '../src/agent.js';
import { quietLog, templates, types } from './helpers.js';

const TRANCHES = [{ milestone: 'Shipped', fraction: '0.6' }, { milestone: 'Delivered', fraction: '0.3' }];
const terms = (releasedCount) => ({ releasedCount: String(releasedCount), tranches: TRANCHES });

test('tranchesUnlocked follows milestone order and releases in sequence', () => {
  assert.equal(tranchesUnlocked(terms(0), 'Pending'), 0);
  assert.equal(tranchesUnlocked(terms(0), 'Shipped'), 1);
  assert.equal(tranchesUnlocked(terms(0), 'Delivered'), 2);
  assert.equal(tranchesUnlocked(terms(0), 'Confirmed'), 2);
  assert.equal(tranchesUnlocked(terms(1), 'Shipped'), 0);
  assert.equal(tranchesUnlocked(terms(1), 'Delivered'), 1);
  assert.equal(tranchesUnlocked(terms(2), 'Confirmed'), 0);
});

// Simulates the seller's view of one funding agreement on the ledger.
function fakeSellerLedger({ releasedCount = 0, failReleases = 0 } = {}) {
  const state = { releasedCount, version: 0, exercised: [], failReleases, attestations: [] };
  const agreement = () => ({
    contractId: `agr-${state.version}`,
    payload: { invoiceId: 'INV-1', releasedCount: String(state.releasedCount), tranches: TRANCHES, feeAccrued: '0.0' },
  });
  return {
    party: 'Seller::1',
    state,
    async query(templateId) {
      if (templateId === templates.MilestoneAttestation) return state.attestations;
      if (templateId === templates.FundingAgreement) return state.releasedCount <= TRANCHES.length ? [agreement()] : [];
      return [];
    },
    async exercise(templateId, contractId, choice, argument) {
      if (state.failReleases > 0) {
        state.failReleases -= 1;
        throw new Error('contention');
      }
      assert.equal(contractId, `agr-${state.version}`, 'agent must use the latest agreement id');
      state.exercised.push({ choice, argument });
      state.releasedCount += 1;
      state.version += 1;
      return { _1: `agr-${state.version}`, _2: `cash-${state.version}` };
    },
    async fetch(templateId, contractId) {
      if (templateId === templates.CashHolding) return { contractId, payload: { amount: '1.0', currency: 'USD' } };
      return agreement();
    },
  };
}

const attestation = (milestone, id = `att-${milestone}`) => ({
  contractId: id,
  payload: { invoiceId: 'INV-1', milestone, attestedAt: '2026-10-06T00:00:00Z' },
});

function agentWith(ledger) {
  const log = quietLog();
  return { log, agent: new SellerAgent({ ledger, issuerLedger: null, templates, log, pollMs: 1000 }) };
}

test('releases one tranche on Shipped, then the next on Delivered', async () => {
  const ledger = fakeSellerLedger();
  const { agent, log } = agentWith(ledger);
  ledger.state.attestations = [attestation('Shipped')];
  await agent.tick();
  assert.equal(ledger.state.releasedCount, 1);
  ledger.state.attestations.push(attestation('Delivered'));
  await agent.tick();
  assert.equal(ledger.state.releasedCount, 2);
  assert.deepEqual(types(log).filter((t) => t === 'tranche_released').length, 2);
});

test('a Delivered attestation alone releases both tranches in order', async () => {
  const ledger = fakeSellerLedger();
  const { agent } = agentWith(ledger);
  ledger.state.attestations = [attestation('Delivered')];
  await agent.tick();
  assert.equal(ledger.state.releasedCount, 2);
  assert.ok(ledger.state.exercised.every((e) => e.argument.attestationCid === 'att-Delivered'));
});

test('does not resubmit for an attestation it already handled', async () => {
  const ledger = fakeSellerLedger();
  const { agent } = agentWith(ledger);
  ledger.state.attestations = [attestation('Shipped')];
  await agent.tick();
  await agent.tick();
  assert.equal(ledger.state.exercised.length, 1);
});

test('a milestone that unlocks nothing is logged, not submitted', async () => {
  const ledger = fakeSellerLedger({ releasedCount: 1 });
  const { agent, log } = agentWith(ledger);
  ledger.state.attestations = [attestation('Shipped')];
  await agent.tick();
  assert.equal(ledger.state.exercised.length, 0);
  assert.deepEqual(types(log), ['no_release']);
});

test('overlapping ticks never double-submit', async () => {
  const ledger = fakeSellerLedger();
  const { agent } = agentWith(ledger);
  ledger.state.attestations = [attestation('Shipped')];
  await Promise.all([agent.tick(), agent.tick(), agent.tick()]);
  assert.equal(ledger.state.exercised.length, 1);
});

test('retries a failed release, then gives up after three attempts', async () => {
  const ledger = fakeSellerLedger({ failReleases: 5 });
  const { agent, log } = agentWith(ledger);
  ledger.state.attestations = [attestation('Shipped')];
  for (let i = 0; i < 4; i += 1) await agent.tick();
  assert.equal(ledger.state.exercised.length, 0);
  assert.equal(types(log).filter((t) => t === 'release_failed').length, 3);
});

test('a transient failure succeeds on the next poll', async () => {
  const ledger = fakeSellerLedger({ failReleases: 1 });
  const { agent } = agentWith(ledger);
  ledger.state.attestations = [attestation('Shipped')];
  await agent.tick();
  await agent.tick();
  assert.equal(ledger.state.releasedCount, 1);
});

test('on start, attestations of already-settled deals are skipped silently', async () => {
  const ledger = fakeSellerLedger({ releasedCount: 3 }); // no active agreement: deal settled
  ledger.state.attestations = [attestation('Shipped'), attestation('Delivered')];
  const { agent, log } = agentWith(ledger);
  await agent.start();
  agent.stop();
  assert.deepEqual(types(log), ['started']);
});
