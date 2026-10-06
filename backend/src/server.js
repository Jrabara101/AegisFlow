import http from 'node:http';
import { partyView } from './views.js';

const ROLES = ['seller', 'lender', 'oracle', 'outsider'];

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Routes:
//   POST /webhooks/carrier                      carrier -> oracle (HMAC-signed)
//   POST /demo/shipments/:invoiceId/advance     move the mock shipment to its next status
//   POST /demo/shipments/:invoiceId/replay      re-send the last carrier webhook (duplicate test)
//   GET  /demo/shipments/:invoiceId             current mock shipment status
//   POST /demo/invoices/:invoiceId/buyer-payment  buyer pays; agent settles with the lender
//   GET  /api/activity                          agent activity log
//   GET  /api/events                            live activity feed (Server-Sent Events)
//   GET  /api/view/:role                        what seller | lender | oracle | outsider can see
//   GET  /health
export function createServer({ carrier, oracle, agent, log, ledgers, templates }) {
  const routes = [
    ['POST', /^\/webhooks\/carrier$/, async (req, res) => {
      const result = await oracle.handleWebhook(await readBody(req), req.headers['x-carrier-signature']);
      send(res, result.status, result.body);
    }],
    ['POST', /^\/demo\/shipments\/([^/]+)\/advance$/, async (req, res, [invoiceId]) => {
      send(res, 200, await carrier.advance(invoiceId));
    }],
    ['POST', /^\/demo\/shipments\/([^/]+)\/replay$/, async (req, res, [invoiceId]) => {
      send(res, 200, await carrier.replay(invoiceId));
    }],
    ['GET', /^\/demo\/shipments\/([^/]+)$/, async (req, res, [invoiceId]) => {
      send(res, 200, carrier.status(invoiceId));
    }],
    ['POST', /^\/demo\/invoices\/([^/]+)\/buyer-payment$/, async (req, res, [invoiceId]) => {
      send(res, 200, await agent.settleOnBuyerPayment(invoiceId));
    }],
    ['GET', /^\/api\/activity$/, async (req, res) => {
      send(res, 200, log.list());
    }],
    ['GET', /^\/api\/events$/, async (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      const unsubscribe = log.subscribe((entry) => res.write(`data: ${JSON.stringify(entry)}\n\n`));
      const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000);
      req.on('close', () => { clearInterval(heartbeat); unsubscribe(); });
    }],
    ['GET', /^\/api\/view\/([^/]+)$/, async (req, res, [role]) => {
      if (!ROLES.includes(role)) return send(res, 404, { error: `unknown role; use one of ${ROLES.join(', ')}` });
      send(res, 200, await partyView(ledgers[role], templates));
    }],
    ['GET', /^\/health$/, async (req, res) => {
      send(res, 200, { ok: true });
    }],
  ];

  return http.createServer(async (req, res) => {
    // The dashboard runs on its own dev port during development.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();

    const { pathname } = new URL(req.url, 'http://localhost');
    for (const [method, pattern, handler] of routes) {
      const match = pathname.match(pattern);
      if (match && req.method === method) {
        try {
          return await handler(req, res, match.slice(1).map(decodeURIComponent));
        } catch (err) {
          return send(res, 400, { error: err.message });
        }
      }
    }
    send(res, 404, { error: 'not found' });
  });
}
