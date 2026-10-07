import { Icon } from './Icon.jsx';
import { shortId } from '../lib/format.js';

export const PAGES = [
  { key: 'demo', label: 'Live demo', icon: 'presenter' },
  { key: 'funding', label: 'Funding', icon: 'vault' },
  { key: 'activity', label: 'Activity', icon: 'bot' },
];

const CONNECTION = {
  connecting: { label: 'Connecting', box: 'bg-white text-muted ring-1 ring-line', dot: 'bg-faint', title: 'Opening the event stream' },
  live: { label: 'Live', box: 'bg-ok-soft text-ok', dot: 'bg-ok animate-pulse', title: 'Receiving agent events live' },
  reconnecting: { label: 'Reconnecting', box: 'bg-alert-soft text-alert', dot: 'bg-alert', title: 'Event stream dropped; reconnecting' },
};

function LiveDot({ connection }) {
  const c = CONNECTION[connection];
  return (
    <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${c.box}`} title={c.title}>
      <span className={`size-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// Proves the screen is reading a real Canton ledger: the deployed Daml
// package and the JSON API the backend talks to.
function LedgerBadge({ info }) {
  if (!info) return null;
  return (
    <span
      className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted md:flex"
      title={`Daml package ${info.packageId}\nvia ${info.jsonApiUrl}`}
    >
      <Icon name="ledger" size={14} />
      Canton · pkg <span className="font-mono">{shortId(info.packageId, 4, 4)}</span>
    </span>
  );
}

export function TopBar({ page, onPage, info, connection, invoiceIds, invoiceId, onInvoice, onHelp }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex items-center gap-3">
        <Icon name="shield" size={34} />
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-bold tracking-tight">AegisFlow</span>
          {invoiceIds.length > 0 ? (
            <label className="flex items-center gap-1 text-sm text-muted">
              <span className="sr-only">Deal</span>
              <select
                value={invoiceId ?? ''}
                onChange={(e) => onInvoice(e.target.value)}
                className="cursor-pointer rounded bg-transparent font-mono text-sm text-muted hover:text-ink"
              >
                {invoiceIds.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
            </label>
          ) : (
            <span className="font-mono text-sm text-muted">no deal</span>
          )}
        </div>
      </div>

      <nav aria-label="Pages" className="order-last flex w-full gap-1 rounded-xl bg-white p-1 ring-1 ring-line sm:order-none sm:w-auto">
        {PAGES.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPage(p.key)}
            aria-current={page === p.key ? 'page' : undefined}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
              page === p.key ? 'bg-ink text-white' : 'text-muted hover:bg-ground hover:text-ink'
            }`}
          >
            <Icon name={p.icon} size={16} />
            {p.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <LedgerBadge info={info} />
        <LiveDot connection={connection} />
        <button
          type="button"
          onClick={onHelp}
          className="flex size-9 items-center justify-center rounded-full border border-line bg-white text-muted hover:text-ink"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <Icon name="keyboard" size={18} />
        </button>
      </div>
    </header>
  );
}
