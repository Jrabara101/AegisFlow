# AegisFlow

**Privacy-preserving, agentic invoice factoring on Canton.** Get paid when you ship, without showing anyone who your customers are.

A seller tokenizes an invoice, a single lender escrows a stablecoin advance, and an independent logistics oracle's milestone attestations release the advance in tranches. Each tranche is paid atomically with the invoice being locked as collateral. When the buyer pays, the seller's agent repays principal plus the fee the contract accrued, in one private transaction.

Built for HackCanton League Season 3.

- **Demo video (2.5 min):** https://youtu.be/JZk1fHrNOSU
- **Run it yourself:** [Quick start](#quick-start) below

## What the demo shows

| On screen | What happens on the ledger |
|---|---|
| Ship | The carrier's signed webhook reaches the oracle, which attests **Shipped**; the agent releases 60,000 from escrow |
| Forge webhook | An attacker sends a "delivered" event with a wrong signature: **rejected with HTTP 401**, no money moves |
| Duplicate webhook | The carrier retries an event: **ignored**, nothing is paid twice |
| Deliver | The oracle attests **Delivered**; the agent releases the last 30,000 |
| Buyer pays | The agent repays 90,000 principal + accrued fee to the lender; unused escrow returns |
| Three party cards | Buyer data exists only on the seller's node; the lender sees "not on this node"; an outsider on the same ledger sees **0 contracts** |

Every number and lock on the dashboard comes from a ledger query made *as that party*. Nothing is hard-coded.

## Layout
```
daml.yaml                          # project config, targets Daml SDK 2.10.6
daml/
  AegisFlow/
    Types.daml                     # MilestoneStatus, Tranche
    Cash.daml                      # CashHolding — stablecoin stand-in (split / transfer / disclose)
    Oracle.daml                    # MilestoneAttestation — signed by the logistics oracle
    Factoring.daml                 # InvoiceDetails, InvoiceAsset, FundingProposal, FundingAgreement
  Setup.daml                       # end-to-end demo with balance and privacy assertions
  Tests.daml                       # negative-path tests (attacks and mistakes the ledger rejects)
  Init.daml                        # seeds a running ledger with parties + one funded deal for the backend
backend/                           # Node.js agent layer: mock carrier, logistics oracle, seller agent (see backend/README.md)
frontend/                          # React + Tailwind demo dashboard: three private views, live agent feed (see frontend/README.md)
Bookmark.md                        # hackathon links, devtools catalog, starter repos
```

## Lifecycle
1. **Tokenize** — seller creates a private `InvoiceDetails` (buyer, line items) and an `InvoiceAsset` (face value, due date).
2. **Propose** — seller offers one lender a tranche schedule, e.g. 60% of face on `Shipped` and 30% on `Delivered`, at an annual discount rate, naming the oracle both sides trust.
3. **Accept + escrow** — lender pre-splits exactly the advance in its own transaction, then accepts; the escrow is disclosed to the seller and locked into the `FundingAgreement`.
4. **Release tranches** — the oracle signs a `MilestoneAttestation`; the seller's backend agent presents it, and in one transaction the invoice is locked as financed, the tranche moves from escrow to the seller, and the fee accrues (`amount × rate × days to due date / 360`, rounded to cents).
5. **Settle** — seller repays released principal plus accrued fee; unused escrow returns to the lender; the invoice is closed.

The scripted demo (`Setup.daml`): a 100,000 invoice, 60,000 released on day 0 and 30,000 on day 10 at 12% → 1,700 fee. The lender ends with +1,700; the seller receives 90% of the invoice up to 60 days early. (The live dashboard accrues the fee in real time, so it reads about 1,799.9x.)

## Privacy model
- `InvoiceDetails`: seller-only. Never part of a funding transaction, so no lender ever witnesses buyer identity or line items.
- `InvoiceAsset`: seller is sole signatory and it carries only underwriting fields; the lender witnesses it at tranche release.
- `FundingProposal`: visible to exactly one lender; outsiders see nothing.
- `FundingAgreement`: seller and lender are both signatories, so neither can change terms alone.
- `CashHolding`: escrow and repayment are pre-split to exact amounts in private transactions, so neither side learns the other's wider balance.
- `MilestoneAttestation`: the oracle sees only the milestone it signs, never the funding terms. Only a hash of the shipment evidence goes on-ledger.

`Setup.daml` asserts these after the full lifecycle (lender/outsider can't see details, outsider sees no cash, oracle sees no agreements).

## What the tests prove (`Tests.daml`)
- Proposals can be rejected and withdrawn.
- Invalid terms are refused: over-100% advance, out-of-order milestones, empty schedule.
- Escrow must be exactly the advance in the agreed currency.
- **Double financing is blocked**: once one lender's tranche releases, a second agreement on the same invoice cannot; that lender cancels and recovers its escrow.
- A tranche cannot release before its milestone is attested.
- **The seller cannot forge an oracle attestation**, and attestations from any other party are refused.
- Settlement requires exactly principal plus fee; early settlement returns unused escrow, and the lender cannot cancel after money has moved.

The backend (23 tests: carrier, oracle, agent, deal desk, activity log) and the dashboard (11 tests: deal numbers, button logic, visibility matrix) have their own suites; see [Tests](#tests).

## Prerequisites
- Daml SDK 2.10.6: `daml install 2.10.6` (see https://docs.daml.com/getting-started/installation.html for first-time Windows install steps)
- Node.js 20.19+ or 22.12+ (Vite 8's requirement)
- About 4 GB of free memory for the Canton sandbox

## Quick start

Four terminals, started **in this order**; each step needs the previous one to be up. First time only: run `npm install` in `backend/` and in `frontend/`.

```
# 1. Canton sandbox + JSON API. Wait for "Press 'r' + 'Enter' to re-build..."
cd backend
npm run ledger

# 2. Once per ledger start: build, allocate parties, seed one funded deal
cd backend
npm run init-ledger

# 3. Backend agent, carrier and oracle on :4000. Wait for "agent started"
cd backend
npm start

# 4. Dashboard on http://localhost:5180
cd frontend
npm run dev
```

Then open http://localhost:5180 and press `1` (ship), `A` (forge webhook), `D` (duplicate), `2` (deliver), `3` (buyer pays), and `→` for the Funding and Activity pages. `N` opens a fresh deal without restarting anything; `?` lists every shortcut. The full 90-second script is in [frontend/README.md](frontend/README.md).

To start over from an empty ledger: stop the ledger (Ctrl+C) and the backend, then repeat steps 1–3.

## Tests
```
daml test                      # Setup.daml lifecycle + Tests.daml negative paths, on an ephemeral ledger
cd backend  && npm test        # 23 tests
cd frontend && npm test        # 11 tests
```

To run only the scripted lifecycle against a running sandbox:
```
daml build
daml script --dar .daml/dist/aegisflow-0.1.0.dar --script-name Setup:setup --ledger-host localhost --ledger-port 6865
```

## Known gaps / next steps
- `CashHolding` is a stand-in; production would use a Canton Token Standard holding (e.g. USDC via xReserve).
- The backend agent runs on the local sandbox only, with ledger auth off (see backend/README.md for its demo shortcuts).
- SDK 2.x only: the current Canton Network runs Daml 3.x, which (to be confirmed) drops the contract keys used here. Revisit before moving to DevNet through Node-as-a-Service.
- One oracle party attests milestones; a decentralized oracle (several independent signers) is a natural next step.
- The lender can cancel unilaterally before the first release; a real deployment may want a notice period.
