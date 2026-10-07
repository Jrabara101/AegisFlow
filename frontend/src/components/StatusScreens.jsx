import { Icon } from './Icon.jsx';

function Panel({ icon, tone = 'text-ink', title, children }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-white p-8 text-center">
      <span className={`flex size-16 items-center justify-center rounded-2xl bg-ground ${tone}`}>
        <Icon name={icon} size={32} />
      </span>
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="flex max-w-xl flex-col items-center gap-3 text-muted">{children}</div>
    </section>
  );
}

const Cmd = ({ children }) => (
  <code className="rounded-lg bg-ink px-3 py-2 font-mono text-sm text-white">{children}</code>
);

export function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col gap-4" aria-busy="true" aria-label="Loading ledger views">
      <div className="h-24 animate-pulse rounded-2xl bg-white" />
      <div className="h-36 animate-pulse rounded-2xl bg-white" />
      <div className="flex flex-1 flex-wrap gap-4">
        {[0, 1, 2].map((i) => <div key={i} className="min-h-72 flex-[1_1_300px] animate-pulse rounded-2xl bg-white" />)}
      </div>
    </div>
  );
}

export function BackendDown({ error }) {
  return (
    <Panel icon="plug" tone="text-alert" title="Backend offline">
      <p>The dashboard can't reach the AegisFlow backend. Start it, and this page reconnects by itself.</p>
      <Cmd>cd backend &amp;&amp; npm start</Cmd>
      {error && <p className="font-mono text-xs">{error}</p>}
    </Panel>
  );
}

export function LedgerDown({ error }) {
  return (
    <Panel icon="ledger" tone="text-alert" title="Ledger offline">
      <p>The backend is up, but the Canton sandbox or its JSON API isn't answering. Start the ledger, then seed it once.</p>
      <Cmd>npm run ledger</Cmd>
      <Cmd>npm run init-ledger</Cmd>
      {error && <p className="font-mono text-xs break-all">{error}</p>}
    </Panel>
  );
}

export function NoDeal({ onOpen, busy }) {
  return (
    <Panel icon="invoice" title="No deal on the ledger yet">
      <p>Open a funded deal: the seller tokenizes a 100,000 USD invoice and the lender escrows a 90% advance.</p>
      <button
        type="button"
        onClick={onOpen}
        disabled={busy}
        className="flex min-h-12 items-center gap-2 rounded-xl bg-ink px-5 font-semibold text-white disabled:opacity-40"
      >
        <Icon name="plus" /> Open a deal
      </button>
    </Panel>
  );
}
