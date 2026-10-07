import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './lib/api.js';
import { availableActions, deriveDeal, invoiceIds as listInvoices } from './lib/deal.js';
import { contextFor } from './lib/visibility.js';
import { describe } from './lib/events.js';
import { money } from './lib/format.js';
import { useActivity } from './hooks/useActivity.js';
import { useLedgerInfo, useLedgerViews, useRememberedAgreements, useShipment } from './hooks/useLedger.js';
import { useShortcuts } from './hooks/useShortcuts.js';
import { TopBar, PAGES } from './components/TopBar.jsx';
import { Toasts, useToasts } from './components/Toasts.jsx';
import { ShortcutHelp } from './components/ShortcutHelp.jsx';
import { BackendDown, LedgerDown, LoadingScreen, NoDeal } from './components/StatusScreens.jsx';
import { LiveDemo } from './pages/LiveDemo.jsx';
import { Funding } from './pages/Funding.jsx';
import { Activity } from './pages/Activity.jsx';

function useHashPage() {
  const read = () => {
    const key = window.location.hash.replace('#/', '');
    return PAGES.some((p) => p.key === key) ? key : 'demo';
  };
  const [page, setPage] = useState(read);
  useEffect(() => {
    const onHash = () => setPage(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = useCallback((key) => { window.location.hash = `#/${key}`; }, []);
  return [page, go];
}

const shipmentLabel = { in_transit: 'in transit', delivered: 'delivered', receipt_confirmed: 'receipt confirmed' };

export default function App() {
  const [page, goTo] = useHashPage();
  const [chosen, setChosen] = useState(null);
  const [busy, setBusy] = useState(null);
  const [help, setHelp] = useState(false);
  const { toasts, push } = useToasts();

  const activity = useActivity();
  const ledger = useLedgerViews(activity.latest?.id);
  const info = useLedgerInfo(ledger.status === 'ok');
  const remembered = useRememberedAgreements(ledger.views);

  const invoiceIds = ledger.views ? listInvoices(ledger.views.seller) : [];
  const invoiceId = chosen && invoiceIds.includes(chosen) ? chosen : invoiceIds[0] ?? null;
  const shipment = useShipment(invoiceId, `${ledger.updatedAt}-${activity.latest?.id}`);

  const events = useMemo(() => activity.entries.map(describe), [activity.entries]);
  const deal = ledger.views && invoiceId
    ? deriveDeal({ invoiceId, views: ledger.views, shipment, activity: activity.entries, remembered: remembered.get(invoiceId) })
    : null;
  const ctx = deal ? contextFor(ledger.views, deal) : null;
  const can = availableActions(deal);
  const latest = activity.latest ? describe(activity.latest) : null;

  // Runs one demo action against the backend and reports what happened.
  const run = useCallback(async (name, call, report) => {
    if (busy) return;
    setBusy(name);
    try {
      report(await call());
    } catch (err) {
      push('error', 'Action failed', err.message);
    } finally {
      setBusy(null);
      ledger.refresh();
    }
  }, [busy, push, ledger]);

  const advance = (name) => () => run(name, () => api.advance(invoiceId), (r) => {
    if (r.delivered) push('ok', `Carrier: ${shipmentLabel[r.event.status]}`, 'Oracle signed the milestone; the agent releases the tranche.');
    else push('error', 'Oracle refused the webhook', `HTTP ${r.httpStatus}`);
  });

  const actions = {
    ship: advance('ship'),
    deliver: advance('deliver'),
    pay: () => run('pay', () => api.buyerPays(invoiceId), (r) =>
      push('ok', `Settled: ${money(r.repaymentDue)} to lender`, `Principal ${money(r.principal)} + fee ${money(r.fee)}, in one private transaction.`)),
    replay: () => run('replay', () => api.replay(invoiceId), (r) =>
      r.oracleResponse?.duplicate
        ? push('blocked', 'Duplicate ignored', 'The oracle already attested this event. Nothing is paid twice.')
        : push('error', 'Duplicate was not recognised', `HTTP ${r.httpStatus}`)),
    attack: () => run('attack', () => api.forge(invoiceId), (r) =>
      r.httpStatus === 401
        ? push('blocked', 'Attack blocked', 'The forged "delivered" webhook failed the signature check (HTTP 401). No tranche moved.')
        : push('error', 'Forged webhook was not rejected', `HTTP ${r.httpStatus}`)),
    newDeal: () => run('newDeal', () => api.openDeal(), (r) => {
      setChosen(r.invoiceId);
      push('ok', `Opened ${r.invoiceId}`, `${money(r.advance)} USD escrowed by the lender.`);
    }),
  };

  const ready = ledger.status === 'ok' && deal;
  const flipPage = (step) => {
    const i = PAGES.findIndex((p) => p.key === page);
    goTo(PAGES[(i + step + PAGES.length) % PAGES.length].key);
  };
  useShortcuts({
    1: () => ready && can.ship && actions.ship(),
    2: () => ready && can.deliver && actions.deliver(),
    3: () => ready && can.pay && actions.pay(),
    d: () => ready && can.replay && actions.replay(),
    a: () => ready && can.attack && actions.attack(),
    n: () => ledger.status === 'ok' && actions.newDeal(),
    ArrowRight: () => flipPage(1),
    ArrowLeft: () => flipPage(-1),
    p: () => document.documentElement.classList.toggle('presenter'),
    '?': () => setHelp((h) => !h),
    Escape: () => setHelp(false),
  });

  let body;
  if (ledger.status === 'loading') body = <LoadingScreen />;
  else if (ledger.status === 'backend-down' && !ledger.views) body = <BackendDown error={ledger.error} />;
  else if (ledger.status === 'ledger-down' && !ledger.views) body = <LedgerDown error={ledger.error} />;
  else if (!deal) body = <NoDeal onOpen={actions.newDeal} busy={Boolean(busy)} />;
  else if (page === 'funding') body = <Funding deal={deal} views={ledger.views} ctx={ctx} />;
  else if (page === 'activity') body = <Activity events={events} invoiceId={invoiceId} />;
  else body = <LiveDemo deal={deal} views={ledger.views} ctx={ctx} can={can} busy={busy} actions={actions} events={events} latest={latest} onPage={goTo} />;

  // Lost the backend or ledger after a good read: keep the last view up, flagged.
  const stale = ledger.views && ledger.status !== 'ok';

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto box-border flex w-full max-w-[1600px] flex-1 flex-col gap-5 p-[clamp(1rem,3vw,2rem)]">
        <TopBar
          page={page}
          onPage={goTo}
          info={info}
          connection={activity.connection}
          invoiceIds={invoiceIds}
          invoiceId={invoiceId}
          onInvoice={setChosen}
          onHelp={() => setHelp(true)}
        />
        {stale && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-alert/40 bg-alert-soft px-4 py-3 text-sm font-semibold text-alert">
            {ledger.status === 'backend-down' ? 'Backend offline' : 'Ledger offline'}: showing the last known state. Reconnecting…
          </div>
        )}
        {body}
      </div>
      <Toasts toasts={toasts} />
      {help && <ShortcutHelp onClose={() => setHelp(false)} />}
    </div>
  );
}
