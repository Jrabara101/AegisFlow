# HackCanton Season 3 — Links & DevTools

## Core Links
- Hackathon registration/dashboard: https://appsfactory.cc/hackathons
- Host org (Noders): https://noders.team/
- DevTools catalog: https://appsfactory.cc/devtools/tools
- GitHub devtools listing: https://appsfactory.cc/devtools/github
- Canton News: https://appsfactory.cc/news
- Ecosystem: https://appsfactory.cc/ecosystem
- Academy: https://appsfactory.cc/academy
- Accelerator: https://appsfactory.cc/accelerator
- Brand kit: https://appsfactory.cc/brand-kit
- Discord: https://discord.gg/v8ESnCnhJp
- Telegram: https://telegram.me/appsfactory_cc
- X/Twitter: https://x.com/appsfactory_cc

## Event Snapshot (checked 2026-09-03)
- **HackCanton League — Season #3**, hosted by [NODERS]
- Format: Online, 5 weeks, business-first MVP build program
- Prize pool: up to $50,000 in cash & credits
- Registration countdown observed on page: ~13 days 9 hours remaining (verify live — may differ from any "5 days" figure mentioned elsewhere)
- Partners shown: Canton, DCU Web3, Hashlock, and others (Canton logo repeated)

## Project Concept — AegisFlow
Privacy-Insulated Agentic RWA Factoring & Intraday Liquidity Engine. Tokenizes corporate invoices as RWAs on Canton/Daml with strict signatory/observer privacy (seller vs. lending bank), atomic settlement, and agentic triggers off logistics/ERP milestones. Stack: Daml (contracts) + Node.js/Python (backend/ERP-logistics integration) + React/Tailwind (executive dashboard).

## DevTools Catalog — Full List (26 tools, from appsfactory.cc/devtools/tools)
Categories available on the page: All, Analytics, Crosschain, dApp, Dashboard, DevTools, Explorer, Hub, Identity, Monitoring, Payment, Security, Staking, Storage, Wallet

| Tool | Categories | Description | Link |
|---|---|---|---|
| 5N Lighthouse Explorer | Explorer | Explore Canton with Lighthouse, track transactions and ensure privacy | https://lighthouse.fivenorth.io/ |
| BitSafe | Staking, dApp | Earn yield on Bitcoin via regulated DeFi and flexible custody options | https://www.bitsafe.finance/ |
| Bitwave | Dashboard, Payment | Automate crypto accounting and reporting for business | https://www.bitwave.io/ |
| Brale | dApp, Payment | Launch stablecoins on any chain — compliant and flexible | https://brale.xyz/ |
| Bron | Identity, dApp | Manage Web3 IDs and DAOs securely | https://bron.org/ |
| Canton Network Explorer | Explorer | Monitor network status, validator stats, governance votes | https://explorer.canton.nodefortress.io/ |
| Canton Wallet | Wallet | Secure crypto wallet with passkey login and privacy | https://cantonwallet.com/ |
| Cantonscan | Explorer | Explore Canton blockchain transactions/metrics in real time | https://www.cantonscan.com/ |
| CantonView | Analytics, Explorer | Monitor real-time Canton blockchain metrics and activity | https://ccview.io/ |
| Catalyst Blockchain Manager | Dashboard, Monitoring | Deploy and manage enterprise blockchain networks | https://catalyst.intellecteu.com/ |
| CCTools | DevTools | Community toolkit for building secure DAML apps on Canton | https://cctools.network/ |
| Chata.ai | — | Instant data insights via AutoQL technology | https://chata.ai/ |
| Coin Metrics | Analytics | Crypto market data and analytics | https://coinmetrics.io/ |
| Copper | Security | Store, trade, settle crypto securely (institutional) | https://copper.co/ |
| Cygnet | Storage | Anchor off-chain documents on Canton with verifiable hashes | https://www.cygnet.ink/ |
| Denex Gas Station | dApp | Buy Canton bandwidth instantly, automate dApp transactions | https://denex.io/gasstation |
| Dfns | Wallet | Secure crypto wallets, API-first, MPC-powered, for institutions | https://www.dfns.co/ |
| Digital Asset | Hub | Tokenize real assets, enable instant settlement | https://www.digitalasset.com/ |
| Fairmint | dApp, Wallet | Transfer and manage company shares onchain | https://www.fairmint.com/ |
| GSF | Crosschain, Payment | Secure, private, atomic cross-chain asset transfers | https://sync.global/ |
| Hydra X | dApp, Analytics | Regulated digital ecosystem for capital markets | https://www.hydrax.io/ |
| iCanMonitor | Monitoring | Track validators and secure uptime | https://www.icanmonitor.com/ |
| IntellectEU | Payment, Analytics | Modernize payments and capital markets | https://www.intellecteu.com/ |
| Kaiko | Analytics | Trusted crypto market data and analytics | https://www.kaiko.com/ |
| Lukka | Analytics | Crypto data and compliance solutions | https://lukka.tech/ |
| Modo | Explorer | Canton Network hub for institutional finance | https://cc.modo.link/ |
| MPCH | Security | Air-gapped, zero-trust digital operations security | https://www.mpch.com/ |
| Seaport | DevTools | DAML Developer Platform — secure apps on Canton | https://seaport.to/ |
| Silvana | Security | Manage digital assets with AI, ZK analytics, privacy | https://silvana.one/ |
| Sync Insights | Analytics | Track Canton validator activity/metrics with AI alerts | https://syncinsights.io/ |
| The Tie | Explorer, Dashboard | Real-time Canton Network metrics dashboard | https://canton.thetie.io/ |

## Tools Most Relevant to AegisFlow
Ranked by direct fit to the RWA-factoring / privacy / agentic-trigger concept:

1. **Seaport** (https://seaport.to/) — DAML developer platform for building secure Canton apps. Likely fastest path to scaffold the InvoiceAsset/FundingAgreement templates.
2. **CCTools** (https://cctools.network/) — Community DAML toolkit; second option/backup for contract tooling.
3. **Digital Asset** (https://www.digitalasset.com/) — The Canton/Daml creator's own RWA tokenization + instant settlement hub; good for architecture reference and legitimacy in the pitch (judges know this brand).
4. **Cygnet** (https://www.cygnet.ink/) — Anchors off-chain documents on Canton with verifiable hashes. Directly useful for proving invoice/logistics document integrity without exposing contents — reinforces the privacy narrative.
5. **GSF / sync.global** (https://sync.global/) — Atomic, private cross-chain transfers. Relevant if settlement needs to reach institutional stablecoins outside Canton.
6. **Dfns** (https://www.dfns.co/) — MPC institutional wallet infra; could back the "lending bank" custody side.
7. **Bitwave** (https://www.bitwave.io/) — Crypto accounting/reporting automation; maps to the ERP integration angle for invoice generation and audit trail.
8. **iCanMonitor** / **Sync Insights** (https://www.icanmonitor.com/ / https://syncinsights.io/) — Useful for demo-time monitoring dashboards showing agent triggers firing in real time.
9. **Cantonscan** / **CantonView** / **5N Lighthouse Explorer** — For verifying during dev/demo that no data leaks to non-participating nodes (the privacy claim judges will probe).
10. **Fairmint** (https://www.fairmint.com/) — Precedent for onchain corporate financial instruments (shares); useful as a comparable case study in the pitch deck.

## GitHub Starter Repos (from appsfactory.cc/devtools/github, org: digital-asset)
| Repo | Category | Description | Link |
|---|---|---|---|
| **cn-quickstart** | Examples, Doc | Official Canton Network app scaffold (Daml + Spring Boot backend + Vue/Vite frontend, Docker Compose, Keycloak auth, Splice LocalNet, Grafana/Prometheus observability) | https://github.com/digital-asset/cn-quickstart |
| **daml-finance** | SDK, Library | Reusable Daml libraries for tokenization — Instrument/Holding-style financial primitives, saves building ownership/economic-terms logic from scratch | https://github.com/digital-asset/daml-finance |
| daml-finance-app | Examples, Integration | Example app showing daml-finance libraries integrated end-to-end | https://github.com/digital-asset/daml-finance-app |
| daml | Smart Contracts, SDK | The Daml language itself (compiler, tooling) | https://github.com/digital-asset/daml |
| dazl-client | Client Libraries, SDK | Python Ledger API client (dazl) — useful for the Python backend/agent side | https://github.com/digital-asset/dazl-client |
| go-daml | SDK, Client Libraries | Canton Go SDK (from Noders) | (see noders.team) |
| splice | Integration, Deployment | Splice repo — Canton Network global synchronizer sync layer | https://github.com/digital-asset/splice |
| xreserve-deposits | Examples, Tools | Sample USDC deposit implementation on Canton via xReserve | https://github.com/digital-asset/xreserve-deposits |
| ex-secure-canton-infra | Deployment, Security | Reference secure deployment infra for Canton | https://github.com/digital-asset/ex-secure-canton-infra |

**Recommended starting point for AegisFlow:** clone `cn-quickstart` as the base scaffold (it already wires Daml + backend + frontend + Docker), then vendor in `daml-finance` as a dependency for the Instrument/Holding primitives instead of writing InvoiceAsset ownership logic from scratch.

## Open Questions / To Revisit
- Confirm actual registration deadline (page showed ~13d 9h at time of check, contradicts the "under 5 days" figure from the original brief — recheck before finalizing team plans).
- ~~Check GitHub devtools page for starter repos/templates~~ — done, see above.
