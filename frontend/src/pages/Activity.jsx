import { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { EventCard } from '../components/EventCard.jsx';
import { TONE_BADGE, aboutInvoice } from '../lib/events.js';
import { clockTime } from '../lib/format.js';

const LANES = [
  { key: 'carrier', label: 'Carrier', icon: 'truck' },
  { key: 'oracle', label: 'Oracle', icon: 'seal' },
  { key: 'agent', label: 'Agent', icon: 'bot' },
];

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'carrier', label: 'Carrier', test: (e) => e.actor === 'carrier' },
  { key: 'oracle', label: 'Oracle', test: (e) => e.actor === 'oracle' },
  { key: 'agent', label: 'Agent', test: (e) => e.actor === 'agent' },
  { key: 'blocked', label: 'Blocked', test: (e) => e.blocked || e.attack || e.failed },
];

const TIMELINE_MAX = 28;

function Tile({ icon, label, value, tone }) {
  return (
    <div className="flex min-w-0 flex-[1_1_160px] items-center gap-3 rounded-2xl border border-line bg-white p-4">
      <span className={`flex size-11 flex-none items-center justify-center rounded-xl ${tone}`}><Icon name={icon} /></span>
      <span className="flex flex-col">
        <span className="font-mono text-2xl font-semibold">{value}</span>
        <span className="text-xs font-semibold text-muted">{label}</span>
      </span>
    </div>
  );
}

// Carrier, oracle and agent as swimlanes; each marker is one log entry, in
// order. Blocked attempts are drawn in orange with a shield.
function Timeline({ events }) {
  const shown = events.slice(-TIMELINE_MAX);
  const x = (i) => `${((i + 0.5) / Math.max(shown.length, 1)) * 100}%`;
  return (
    <section aria-label="Timeline" className="flex min-h-72 flex-1 flex-col gap-2 rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Timeline</h2>
        <span className="font-mono text-xs text-muted">
          {shown.length ? `${clockTime(shown[0].at)} → ${clockTime(shown.at(-1).at)}` : 'waiting for events'}
        </span>
      </div>
      <div className="flex flex-1 flex-col overflow-x-auto">
        <div className="flex min-w-[640px] flex-1 flex-col">
          {LANES.map((lane) => (
            <div key={lane.key} className="flex min-h-20 flex-1 items-center gap-3 border-b border-line last:border-b-0">
              <span className="flex w-24 flex-none items-center gap-2 text-sm font-semibold text-muted">
                <Icon name={lane.icon} size={16} />{lane.label}
              </span>
              <div className="relative h-full flex-1">
                <span className="absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2 bg-track" />
                {shown.map((e, i) => e.actor === lane.key && (
                  <span
                    key={e.id}
                    title={`${clockTime(e.at)} · ${e.message}`}
                    className={`absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ring-4 ring-white ${TONE_BADGE[e.tone]}`}
                    style={{ left: x(i) }}
                  >
                    <Icon name={e.blocked ? 'x' : e.icon} size={16} />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Activity({ events, invoiceId }) {
  const [filter, setFilter] = useState('all');
  const [dealOnly, setDealOnly] = useState(false);

  const scoped = dealOnly ? events.filter((e) => aboutInvoice(e, invoiceId)) : events;
  const listed = scoped.filter(FILTERS.find((f) => f.key === filter).test).slice().reverse();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <Tile icon="bot" label="Events" value={scoped.length} tone="bg-ground text-ink" />
        <Tile icon="cash" label="Tranches released" value={scoped.filter((e) => e.type === 'tranche_released').length} tone="bg-seller-ring text-seller-deep" />
        <Tile icon="seal" label="Proofs signed" value={scoped.filter((e) => e.type === 'milestone_attested').length} tone="bg-oracle-soft text-oracle" />
        <Tile icon="shield" label="Attempts blocked" value={scoped.filter((e) => e.blocked).length} tone="bg-alert-soft text-alert" />
      </div>

      <Timeline events={scoped} />

      <section aria-label="Event log" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filter events" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  filter === f.key ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted">
            <input type="checkbox" checked={dealOnly} onChange={(e) => setDealOnly(e.target.checked)} className="size-4 accent-ink" />
            Only {invoiceId}
          </label>
        </div>
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
          {listed.length === 0 && <li className="text-sm text-muted">No events match.</li>}
          {listed.map((e) => <EventCard key={e.id} event={e} showTime />)}
        </ol>
      </section>
    </div>
  );
}
