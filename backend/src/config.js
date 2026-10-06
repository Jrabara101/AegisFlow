import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.resolve(here, '..', 'data');

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jsonApiUrl: process.env.JSON_API_URL ?? 'http://localhost:7575',
  // Shared secret between the mock carrier and the oracle's webhook endpoint.
  carrierWebhookSecret: process.env.CARRIER_WEBHOOK_SECRET ?? 'dev-carrier-secret',
  agentPollMs: Number(process.env.AGENT_POLL_MS ?? 2000),
  partiesFile: process.env.PARTIES_FILE ?? path.join(dataDir, 'parties.json'),
  darInfoFile: process.env.DAR_INFO_FILE ?? path.join(dataDir, 'dar.json'),
  activityLogFile: process.env.ACTIVITY_LOG_FILE ?? path.join(dataDir, 'activity.jsonl'),
};

function readJson(file) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    throw new Error(`${file} not found. Start the ledger (npm run ledger) and run npm run init-ledger first.`);
  }
  // Strip a UTF-8 BOM, which Windows PowerShell adds when redirecting output.
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

// Party ids written by `npm run init-ledger` (Daml script Init:init).
export function loadParties(file = config.partiesFile) {
  const parties = readJson(file);
  for (const role of ['seller', 'lender', 'oracle', 'issuer', 'outsider']) {
    if (typeof parties[role] !== 'string') throw new Error(`Party file is missing "${role}"`);
  }
  return parties;
}

// Main package id of the deployed DAR, from `daml damlc inspect-dar --json`.
export function loadPackageId(file = config.darInfoFile) {
  const info = readJson(file);
  if (typeof info.main_package_id !== 'string') throw new Error(`${file} has no main_package_id`);
  return info.main_package_id;
}
