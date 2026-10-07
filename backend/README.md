# AegisFlow Backend — the agent layer

A zero-dependency Node.js service (Node 20+) that turns real-world shipping events into on-ledger money movements:

```
Mock carrier ──signed webhook──▶ Logistics oracle ──MilestoneAttestation──▶ Ledger
                                                                              │
Seller agent ◀────────────── polls attestations visible to the seller ◀───────┘
     └──▶ FundingAgreement_ReleaseTranche (cash escrow → seller, invoice locked)
```

| Component | File | Acts as | Does |
|---|---|---|---|
| Mock carrier | `src/carrier.js` | — | Holds a shipment per invoice (`in_transit → delivered → receipt_confirmed`); sends HMAC-signed webhooks; can replay one to test dedupe |
| Logistics oracle | `src/oracle.js` | `LogisticsOracle` party | Verifies the signature, ignores duplicate `eventId`s, maps status → milestone, writes a `MilestoneAttestation` with only a hash of the proof document |
| Seller agent | `src/agent.js` | `Seller` party | Polls attestations, releases every tranche a milestone unlocks (checking first so it never submits a doomed release), retries failures up to 3 times, settles when the buyer pays |
| Activity log | `src/activityLog.js` | — | Every decision, timestamped: in memory, in `data/activity.jsonl`, and streamed live |
| Ledger client | `src/ledger.js` | any party | Thin Daml HTTP JSON API (v1) client |

## Run it

Three terminals, from `backend/`:

```
npm run ledger        # 1. Daml sandbox (6865) + JSON API (7575); wait for "Press 'Ctrl-C' to quit"
npm run init-ledger   # 2. once per ledger start: parties + a funded deal → data/parties.json, data/dar.json
npm start             # 3. backend on http://localhost:4000
npm run demo          # 4. drive the full lifecycle and print what each party sees
```

`npm run init-ledger` must be re-run whenever the ledger is restarted (the sandbox is in-memory).

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/demo/shipments/:invoiceId/advance` | Move the shipment to its next status (sends the webhook) |
| POST | `/demo/shipments/:invoiceId/replay` | Re-send the last webhook — the oracle must ignore it |
| POST | `/demo/shipments/:invoiceId/forge` | Attacker sends a wrongly signed "delivered" webhook — the oracle must reject it (401) |
| GET | `/demo/shipments/:invoiceId` | Current shipment status |
| POST | `/demo/invoices/:invoiceId/buyer-payment` | Buyer pays; agent repays principal + fee to the lender |
| POST | `/demo/deals` | Open a fresh funded deal (next `INV-<year>-NNNN`) — restarts the demo without restarting the ledger |
| POST | `/webhooks/carrier` | Carrier → oracle (header `X-Carrier-Signature`: HMAC-SHA256 hex of the body) |
| GET | `/api/view/:role` | What `seller`, `lender`, `oracle` or `outsider` can see — queried *as that party* |
| GET | `/api/activity` | Activity log |
| GET | `/api/events` | Live activity feed (Server-Sent Events) |
| GET | `/api/ledger-info` | Deployed Daml package id and the party ids the backend acts as |

## Configuration

| Env var | Default |
|---|---|
| `PORT` | `4000` |
| `JSON_API_URL` | `http://localhost:7575` |
| `CARRIER_WEBHOOK_SECRET` | `dev-carrier-secret` — change for anything beyond local dev |
| `AGENT_POLL_MS` | `2000` |

## Tests

```
npm test
```

Unit tests with fake ledgers (no sandbox needed): signature checks, tampered bodies, duplicate and concurrent webhooks, tranche ordering, no double-submits, retry and give-up behaviour.

## Demo-only shortcuts
- Ledger auth is off; `devToken` builds unsigned party tokens. A real deployment gets tokens from an identity provider.
- One seller is assumed; a real oracle maps each shipment to its seller at registration.
- The buyer's payment is simulated by the cash issuer crediting the seller.
- Dedupe and handled-attestation state are in memory; after a restart the agent re-checks attestations of open deals, which is safe because it only submits releases a milestone actually unlocks.
- The activity log is reloaded from `data/activity.jsonl` on start; `npm run init-ledger` deletes it, since a fresh ledger starts a fresh history.
- `/demo/deals` tops the lender up from the cash issuer when it runs low.
