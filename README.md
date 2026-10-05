# AegisFlow — Daml Scaffold

Privacy-insulated agentic RWA invoice factoring on Canton. Core `InvoiceDetails` / `InvoiceAsset` / `FundingProposal` / `FundingAgreement` templates plus an end-to-end Daml Script demo.

## Layout
```
daml.yaml                          # project config, targets Daml SDK 2.10.6
daml/
  AegisFlow/
    Factoring.daml                 # all templates (one module avoids an import cycle)
  Setup.daml                       # Daml Script: full happy-path demo + privacy assertions
Bookmark.md                        # hackathon links, devtools catalog, starter repos
```

## Privacy model
- `InvoiceDetails`: seller-only contract holding buyer identity and line items. It never takes part in a funding transaction, so no lender ever witnesses it (asserted in `Setup.daml`).
- `InvoiceAsset`: `seller` is the sole signatory and it carries only underwriting fields (face value, due date, milestone). The lender becomes a witness of it at disbursement, which is why buyer data lives in `InvoiceDetails` instead.
- `FundingProposal`: scoped to exactly one `lender` as observer — carries only `faceValue`, `advanceRate`, `dueDate`.
- `FundingAgreement`: both `seller` and `lender` are signatories once accepted, so terms are immutable to either party unilaterally, and disbursement + collateral-lock happen in one transaction.

## Prerequisites
Daml SDK 2.10.6:
```
daml install 2.10.6
```
(see https://docs.daml.com/getting-started/installation.html for first-time Windows install steps)

## Build & run the demo
```
daml test
```
runs the demo against an ephemeral sandbox. Against a running sandbox:
```
daml build
daml script --dar .daml/dist/aegisflow-0.1.0.dar --script-name Setup:setup --ledger-host localhost --ledger-port 6865
```

## Known gaps / next steps
- `FundingAgreement_Disburse` currently just flips `financed = True` — the real advance payout should transfer a stablecoin holding in the same choice for true atomic swap semantics.
- `MilestoneStatus` updates are trusted seller input; the backend agent should derive them from a logistics/ERP webhook, ideally attested by a separate oracle party.
- SDK 2.x only: the current Canton Network runs Daml 3.x, which (to be confirmed) drops contract keys used here. Revisit before final deployment.
- No negative-path tests yet (reject, withdraw, double-financing attempt).
