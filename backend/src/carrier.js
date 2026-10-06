import { createHmac, randomUUID } from 'node:crypto';

// Carrier statuses in the order a shipment moves through them.
export const CARRIER_STATUSES = ['in_transit', 'delivered', 'receipt_confirmed'];
const PROOF_DOCUMENTS = ['bill_of_lading', 'proof_of_delivery', 'buyer_receipt'];

export function signPayload(body, secret) {
  return createHmac('sha256', secret).update(body).digest('hex');
}

// Stand-in for a real carrier/ERP integration. Holds a shipment per invoice
// and, when advanced, sends a signed webhook like a real carrier would.
// Lets the demo drive shipments on cue instead of depending on an external API.
export class MockCarrier {
  constructor({ webhookUrl, secret, log, fetchImpl = fetch }) {
    this.webhookUrl = webhookUrl;
    this.secret = secret;
    this.log = log;
    this.fetch = fetchImpl;
    this.shipments = new Map(); // invoiceId -> { trackingNumber, statusIndex, lastEvent }
  }

  #shipment(invoiceId) {
    if (!this.shipments.has(invoiceId)) {
      this.shipments.set(invoiceId, {
        trackingNumber: `TRK-${invoiceId.replace(/[^A-Z0-9]/gi, '')}`,
        statusIndex: -1,
        lastEvent: null,
      });
    }
    return this.shipments.get(invoiceId);
  }

  status(invoiceId) {
    const s = this.#shipment(invoiceId);
    return { invoiceId, trackingNumber: s.trackingNumber, status: CARRIER_STATUSES[s.statusIndex] ?? 'not_shipped' };
  }

  // Moves the shipment to its next status and delivers the webhook.
  async advance(invoiceId) {
    const s = this.#shipment(invoiceId);
    if (s.statusIndex >= CARRIER_STATUSES.length - 1) {
      throw new Error(`Shipment for ${invoiceId} is already ${CARRIER_STATUSES[s.statusIndex]}`);
    }
    s.statusIndex += 1;
    s.lastEvent = {
      eventId: randomUUID(),
      invoiceId,
      trackingNumber: s.trackingNumber,
      status: CARRIER_STATUSES[s.statusIndex],
      occurredAt: new Date().toISOString(),
      // The proof document a real carrier would attach (bill of lading, POD).
      document: { kind: PROOF_DOCUMENTS[s.statusIndex], reference: `${s.trackingNumber}-${s.statusIndex}` },
    };
    this.log.record('carrier', 'status_changed', `${invoiceId} is now ${s.lastEvent.status}`, { trackingNumber: s.trackingNumber, eventId: s.lastEvent.eventId });
    return this.#deliver(s.lastEvent);
  }

  // Re-sends the last webhook unchanged, as real carriers do on retries.
  // The oracle must recognise it as a duplicate.
  async replay(invoiceId) {
    const s = this.#shipment(invoiceId);
    if (!s.lastEvent) throw new Error(`No webhook has been sent for ${invoiceId} yet`);
    this.log.record('carrier', 'webhook_retried', `Re-sending ${s.lastEvent.status} webhook for ${invoiceId}`, { eventId: s.lastEvent.eventId });
    return this.#deliver(s.lastEvent);
  }

  async #deliver(event) {
    const body = JSON.stringify(event);
    const res = await this.fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Carrier-Signature': signPayload(body, this.secret) },
      body,
    });
    const result = await res.json().catch(() => ({}));
    return { delivered: res.ok, httpStatus: res.status, event, oracleResponse: result };
  }
}
