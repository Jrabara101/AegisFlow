import { Stepper } from '../components/Stepper.jsx';
import { DemoControls } from '../components/DemoControls.jsx';
import { MoneyFlow } from '../components/MoneyFlow.jsx';
import { PartyCard } from '../components/PartyCard.jsx';
import { EventCard } from '../components/EventCard.jsx';
import { Icon } from '../components/Icon.jsx';
import { cashOf } from '../lib/deal.js';
import { daysUntil, money } from '../lib/format.js';

function DealChip({ deal }) {
  const label = deal.status === 'settled'
    ? 'Settled'
    : deal.dueDate ? `Due in ${daysUntil(deal.dueDate)} days` : '—';
  return (
    <div className="flex flex-none items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
      <Icon name={deal.status === 'settled' ? 'check' : 'clock'} className="text-muted" />
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-lg font-semibold">{money(deal.faceValue)} {deal.currency}</span>
        <span className="text-xs font-semibold text-muted">{label}</span>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-[#344054]">
      <span className="flex items-center gap-1.5"><span className="size-4 rounded bg-ink" />Visible</span>
      <span className="flex items-center gap-1.5"><span className="hatch size-4 rounded" />Hidden by the ledger</span>
    </div>
  );
}

export function LiveDemo({ deal, views, ctx, can, busy, actions, events, latest, onPage }) {
  const recent = events.slice(-4).reverse();
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <Stepper step={deal.step} working={deal.awaitingAgent || Boolean(busy)} />
        <DealChip deal={deal} />
      </div>

      <DemoControls can={can} busy={busy} actions={actions} />

      <MoneyFlow
        deal={deal}
        lenderFree={cashOf(views.lender).free}
        sellerBalance={cashOf(views.seller).total}
        latest={latest}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">One ledger, three views</h2>
        <Legend />
      </div>
      <div className="flex flex-1 flex-wrap items-stretch gap-4">
        {['seller', 'lender', 'outsider'].map((role) => (
          <PartyCard key={role} role={role} view={views[role]} deal={deal} ctx={ctx} />
        ))}
      </div>

      <section aria-label="Agent activity" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Agent activity</h2>
          <button type="button" onClick={() => onPage('activity')} className="text-sm font-semibold text-seller hover:text-seller-deep">
            Full log →
          </button>
        </div>
        <ol className="flex flex-wrap gap-2.5">
          {recent.length === 0 && <li className="text-sm text-muted">No agent activity yet. Press Ship to start.</li>}
          {recent.map((e, i) => (
            <EventCard key={e.id} event={e} highlight={i === 0} className="flex-[1_1_200px]" />
          ))}
        </ol>
      </section>
    </div>
  );
}
