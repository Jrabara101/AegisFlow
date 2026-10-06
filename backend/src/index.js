import { config, loadParties, loadPackageId } from './config.js';
import { LedgerClient, templateIds } from './ledger.js';
import { ActivityLog } from './activityLog.js';
import { MockCarrier } from './carrier.js';
import { LogisticsOracle } from './oracle.js';
import { SellerAgent } from './agent.js';
import { createServer } from './server.js';

const parties = loadParties();
const templates = templateIds(loadPackageId());
const ledgerFor = (party) => new LedgerClient(config.jsonApiUrl, party);
const ledgers = {
  seller: ledgerFor(parties.seller),
  lender: ledgerFor(parties.lender),
  oracle: ledgerFor(parties.oracle),
  outsider: ledgerFor(parties.outsider),
  issuer: ledgerFor(parties.issuer),
};

const log = new ActivityLog(config.activityLogFile);
const carrier = new MockCarrier({
  webhookUrl: `http://localhost:${config.port}/webhooks/carrier`,
  secret: config.carrierWebhookSecret,
  log,
});
const oracle = new LogisticsOracle({
  ledger: ledgers.oracle,
  templates,
  seller: parties.seller,
  secret: config.carrierWebhookSecret,
  log,
});
const agent = new SellerAgent({
  ledger: ledgers.seller,
  issuerLedger: ledgers.issuer,
  templates,
  log,
  pollMs: config.agentPollMs,
});

const server = createServer({ carrier, oracle, agent, log, ledgers, templates });
server.listen(config.port, () => {
  console.log(`AegisFlow backend on http://localhost:${config.port} (JSON API ${config.jsonApiUrl})`);
  agent.start();
});

const shutdown = () => {
  agent.stop();
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
