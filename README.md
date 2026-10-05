# AegisFlow — Daml Scaffold

Privacy-insulated agentic RWA invoice factoring on Canton. Week 1 scaffold: core `InvoiceAsset` / `FundingProposal` / `FundingAgreement` templates plus an end-to-end Daml Script demo.

## Layout
```
daml.yaml                          # project config, targets Daml SDK 2.9.5
daml/
  AegisFlow/
    InvoiceAsset.daml              # InvoiceAsset + FundingProposal templates
    FundingAgreement.daml          # FundingAgreement (atomic settlement)
  Setup.daml                       # Daml Script: full happy-path demo + a privacy assertion
Bookmark.md                        # hackathon links, devtools catalog, starter repos
```

## Privacy model
- `InvoiceAsset`: `seller` is the sole signatory. No lender, no other party, sees this contract exists until the seller explicitly proposes financing to one.
- `FundingProposal`: scoped to exactly one `lender` as observer — carries only `faceValue`, `advanceRate`, `dueDate`. Buyer identity and line items never leave the seller's node.
- `FundingAgreement`: both `seller` and `lender` are signatories once accepted, so terms are immutable to either party unilaterally, and disbursement + collateral-lock happen in one transaction.

## Prerequisites
Daml SDK is **not installed** on this machine — install it before building:
```
curl -sSL https://get.daml.com/ | sh
```
(or see https://docs.daml.com/getting-started/installation.html for Windows-specific steps)

## Build & run the demo
```
daml build
daml script --dar .daml/dist/aegisflow-0.1.0.dar --script-name Setup:setup --sandbox-port 6865
```
Or just `daml test` to run it against an ephemeral sandbox.

## Known gaps / next steps (Week 2+)
- `FundingAgreement_Disburse` currently just flips `financed = True` — the real advance payout should transfer a stablecoin `Holding` (see `daml-finance` library) in the same choice for true atomic swap semantics.
- No `Instrument`/`Holding` integration yet — recommended: vendor `digital-asset/daml-finance` as a dependency once the team clones `cn-quickstart` as the fuller app scaffold (backend + frontend + Docker). See Bookmark.md.
- `MilestoneStatus` updates are currently trusted seller input; Week 2 backend should wire this to a real logistics/ERP webhook via the agent middleware.
- No unit tests beyond the single happy-path script yet — add negative-path scripts (reject, withdraw, double-financing attempt) before Week 4 privacy testing.
