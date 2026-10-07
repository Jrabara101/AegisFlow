// Same origin in development (Vite proxies to the backend). Set
// VITE_BACKEND_URL to call a backend elsewhere; it allows any origin.
export const BASE = import.meta.env?.VITE_BACKEND_URL ?? '';

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(method, path) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method });
  } catch (err) {
    throw new ApiError(0, `Backend unreachable: ${err.message}`);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? `${method} ${path} failed (${res.status})`, body);
  return body;
}

const enc = encodeURIComponent;

export const api = {
  health: () => request('GET', '/health'),
  ledgerInfo: () => request('GET', '/api/ledger-info'),
  view: (role) => request('GET', `/api/view/${role}`),
  activity: () => request('GET', '/api/activity'),
  shipment: (invoiceId) => request('GET', `/demo/shipments/${enc(invoiceId)}`),
  advance: (invoiceId) => request('POST', `/demo/shipments/${enc(invoiceId)}/advance`),
  replay: (invoiceId) => request('POST', `/demo/shipments/${enc(invoiceId)}/replay`),
  forge: (invoiceId) => request('POST', `/demo/shipments/${enc(invoiceId)}/forge`),
  buyerPays: (invoiceId) => request('POST', `/demo/invoices/${enc(invoiceId)}/buyer-payment`),
  openDeal: () => request('POST', '/demo/deals'),
  eventsUrl: () => `${BASE}/api/events`,
};
