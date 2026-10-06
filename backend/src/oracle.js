import { createHash, timingSafeEqual } from 'node:crypto';
import { signPayload } from './carrier.js';

// Carrier status -> on-ledger milestone the oracle is willing to attest.
export const STATUS_TO_MILESTONE = {
  in_transit: 'Shipped',
  delivered: 'Delivered',
  receipt_confirmed: 'Confirmed',
};

export function verifySignature(rawBody, signature, secret) {
  if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = Buffer.from(signPayload(rawBody, secret), 'hex');
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

// Only a hash of the carrier's proof document goes on-ledger; the document
// itself stays with the oracle.
export function evidenceHash(document) {
  return `sha256:${createHash('sha256').update(JSON.stringify(document)).digest('hex')}`;
}

// The independent logistics oracle. Receives signed carrier webhooks and
// turns each verified status change into a MilestoneAttestation signed by
// the oracle party. It never sees funding terms. Assumes a single seller for
// the demo; a real oracle would map each shipment to its seller when the
// shipment is registered.
export class LogisticsOracle {
  constructor({ ledger, templates, seller, secret, log }) {
    this.ledger = ledger; // LedgerClient acting as the oracle party
    this.templates = templates;
    this.seller = seller;
    this.secret = secret;
    this.log = log;
    this.seenEvents = new Set(); // carrier eventIds already attested or in flight
  }

  // Returns { status, body } for the HTTP layer.
  async handleWebhook(rawBody, signature) {
    if (!verifySignature(rawBody, signature, this.secret)) {
      this.log.record('oracle', 'webhook_rejected', 'Rejected carrier webhook with a missing or invalid signature', {}, 'warn');
      return { status: 401, body: { error: 'invalid signature' } };
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return { status: 400, body: { error: 'invalid JSON' } };
    }
    const { eventId, invoiceId, status, occurredAt, document } = event;
    if (!eventId || !invoiceId || !status || !occurredAt || !document) {
      return { status: 400, body: { error: 'missing eventId, invoiceId, status, occurredAt or document' } };
    }

    if (this.seenEvents.has(eventId)) {
      this.log.record('oracle', 'duplicate_ignored', `Ignored duplicate ${status} webhook for ${invoiceId}`, { eventId });
      return { status: 200, body: { duplicate: true } };
    }

    const milestone = STATUS_TO_MILESTONE[status];
    if (!milestone) {
      this.log.record('oracle', 'status_ignored', `Carrier status "${status}" is not an attestable milestone`, { eventId, invoiceId });
      return { status: 202, body: { ignored: true } };
    }

    // Claim the event before the ledger call so a concurrent retry is
    // treated as a duplicate; release it if the call fails so a later retry
    // can succeed.
    this.seenEvents.add(eventId);
    try {
      const hash = evidenceHash(document);
      const created = await this.ledger.create(this.templates.MilestoneAttestation, {
        oracle: this.ledger.party,
        seller: this.seller,
        invoiceId,
        milestone,
        evidenceHash: hash,
        attestedAt: occurredAt,
      });
      this.log.record('oracle', 'milestone_attested', `Signed ${milestone} for ${invoiceId}`, {
        eventId, invoiceId, milestone, evidenceHash: hash, attestationCid: created.contractId,
      });
      return { status: 201, body: { attestationCid: created.contractId, milestone } };
    } catch (err) {
      this.seenEvents.delete(eventId);
      this.log.record('oracle', 'attestation_failed', `Could not attest ${milestone} for ${invoiceId}: ${err.message}`, { eventId }, 'error');
      return { status: 502, body: { error: 'ledger rejected attestation' } };
    }
  }
}
