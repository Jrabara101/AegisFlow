# AegisFlow Dashboard

The demo screen: one Canton ledger, three private views. Every number and every lock on the screen comes from a ledger query made *as that party*. Nothing is hard-coded, so if the outsider card says "0 contracts", the outsider's own query returned nothing.

| Page | Shows |
|---|---|
| **Live demo** | Deal progress, demo buttons, the Lender → Escrow → Seller money flow (animated as the agent moves cash), and the seller / lender / outsider cards side by side |
| **Funding** | Advance ring, fee and repayment as accrued on the ledger, where the face value ends up, tranches, oracle seals (evidence hash + contract id), and a live "who sees what" matrix for all four parties |
| **Activity** | Carrier / oracle / agent swimlanes, blocked attempts in orange, a filterable event log |

## Run the whole system

Three terminals, from the repo root:

```
cd backend && npm run ledger          # 1. Canton sandbox + JSON API (wait for it to come up)
cd backend && npm run init-ledger     # 2. once per ledger start: build, seed parties and one funded deal
cd backend && npm start               # 3. backend on :4000
cd frontend && npm install && npm run dev   # dashboard on http://localhost:5180
```

The dev server proxies `/api` and `/demo` to the backend (`BACKEND_URL` overrides `http://localhost:4000`).

## Demo script (about 90 seconds)

| Key | Action | What the audience sees |
|---|---|---|
| `1` | Ship | Carrier webhook → oracle signs **Shipped** → agent releases 60,000; coin flies Escrow → Seller |
| `A` | Forge webhook | An attacker claims "delivered" with a wrong signature → **Attack blocked (401)**, no money moves |
| `D` | Duplicate webhook | The carrier retries → **Duplicate ignored**, nothing is paid twice |
| `2` | Deliver | Oracle signs **Delivered** → agent releases the last 30,000 |
| `3` | Buyer pays | Agent repays principal + fee to the lender in one private transaction |
| `→` | Funding page | The "who sees what" matrix: buyer data only on the seller node; outsider sees nothing |
| `N` | New deal | Fresh funded deal for the next run, no ledger restart |

Also: `←` / `→` switch pages, `P` presenter mode (larger text for projectors and recordings), `?` shortcut list.

The fee is accrued by the ledger at real time, so it reads about 1,799.9x rather than the 1,700 of the `Setup.daml` script, which jumps the clock to day 10 before delivery.

## States handled
- **Loading**: skeleton cards while the four party views load.
- **Backend offline / ledger offline**: tells you which one and the command to start it; reconnects by itself. If the connection drops mid-demo, the last known state stays up with a banner.
- **No deal yet**: one button opens a funded deal.
- **Event stream**: Connecting / Live / Reconnecting badge; missed events are backfilled on reconnect.

## Tests
```
npm test
```
Unit tests for the parts that decide what is shown: deal stage, escrow, fee and settlement numbers, button availability, and the visibility matrix (including "the outsider sees nothing at any stage"). Fixtures mirror real `/api/view/:role` responses.

## Layout
```
src/
  lib/        deal.js (stage, numbers, actions), visibility.js (who sees what), events.js (log → cards), api.js, format.js
  hooks/      useLedger (poll + refresh on events), useActivity (SSE), useCountUp, useShortcuts
  components/ TopBar, Stepper, DemoControls, MoneyFlow, PartyCard, EventCard, StatusScreens, Toasts, ShortcutHelp
  pages/      LiveDemo, Funding, Activity
```
