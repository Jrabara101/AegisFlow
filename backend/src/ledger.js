import { createHmac } from 'node:crypto';

// The 2.x JSON API needs fully qualified template ids: <packageId>:<module>:<entity>.
export function templateIds(packageId) {
  const id = (entity) => `${packageId}:${entity}`;
  return {
    InvoiceDetails: id('AegisFlow.Factoring:InvoiceDetails'),
    InvoiceAsset: id('AegisFlow.Factoring:InvoiceAsset'),
    FundingProposal: id('AegisFlow.Factoring:FundingProposal'),
    FundingAgreement: id('AegisFlow.Factoring:FundingAgreement'),
    CashHolding: id('AegisFlow.Cash:CashHolding'),
    MilestoneAttestation: id('AegisFlow.Oracle:MilestoneAttestation'),
  };
}

const b64url = (value) => Buffer.from(value).toString('base64url');

// The local sandbox runs without auth, so the JSON API only decodes the
// token to learn which party is acting; the signature is not checked.
// Against an authenticated ledger, replace this with a token from the IdP.
export function devToken(party, applicationId = 'aegisflow') {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    'https://daml.com/ledger-api': {
      ledgerId: 'sandbox',
      applicationId,
      actAs: [party],
      readAs: [party],
    },
  }));
  const signature = createHmac('sha256', 'unsafe-dev-secret').update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export class LedgerError extends Error {
  constructor(status, errors) {
    super(`Ledger request failed (${status}): ${errors.join('; ')}`);
    this.status = status;
    this.errors = errors;
  }
}

// Thin client for the Daml HTTP JSON API (v1), acting as a single party.
export class LedgerClient {
  constructor(baseUrl, party) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.party = party;
    this.token = devToken(party);
  }

  async #post(endpoint, body) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({ status: res.status, errors: [res.statusText] }));
    if (!res.ok || json.status !== 200) throw new LedgerError(json.status ?? res.status, json.errors ?? ['unknown error']);
    return json.result;
  }

  create(templateId, payload) {
    return this.#post('/v1/create', { templateId, payload });
  }

  async exercise(templateId, contractId, choice, argument = {}) {
    const result = await this.#post('/v1/exercise', { templateId, contractId, choice, argument });
    return result.exerciseResult;
  }

  // A single active contract by id, or null if archived or not visible.
  fetch(templateId, contractId) {
    return this.#post('/v1/fetch', { templateId, contractId });
  }

  // Active contracts of `templateId` visible to this party, optionally
  // filtered by exact field matches.
  query(templateId, filter) {
    return this.#post('/v1/query', filter ? { templateIds: [templateId], query: filter } : { templateIds: [templateId] });
  }
}
