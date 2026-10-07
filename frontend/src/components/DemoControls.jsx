import { Icon } from './Icon.jsx';

function Kbd({ children }) {
  return (
    <kbd className="hidden rounded border border-white/30 px-1.5 font-mono text-[11px] font-medium opacity-70 lg:inline">{children}</kbd>
  );
}

const STYLES = {
  primary: 'bg-ink text-white hover:bg-[#1f2a3d]',
  quiet: 'border border-line-strong bg-white text-ink hover:bg-ground',
  danger: 'border border-alert/40 bg-alert-soft text-alert hover:bg-[#ffe4d1]',
};

function ActionButton({ icon, label, hotkey, onClick, enabled, busy, variant = 'primary', grow = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled || busy}
      className={`flex min-h-13 items-center justify-center gap-2.5 rounded-xl px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        grow ? 'flex-[1_1_140px]' : 'flex-[0_1_auto]'
      } ${STYLES[variant]}`}
    >
      {busy ? <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name={icon} />}
      {label}
      {hotkey && <Kbd>{hotkey}</Kbd>}
    </button>
  );
}

// The presenter's buttons. Every one calls the real backend, which drives
// the carrier, oracle, agent and ledger exactly as in production.
export function DemoControls({ can, busy, actions }) {
  return (
    <section aria-label="Demo controls" className="flex flex-wrap items-stretch gap-2.5">
      <ActionButton icon="truck" label="Ship" hotkey="1" onClick={actions.ship} enabled={can.ship} busy={busy === 'ship'} />
      <ActionButton icon="box" label="Deliver" hotkey="2" onClick={actions.deliver} enabled={can.deliver} busy={busy === 'deliver'} />
      <ActionButton icon="cash" label="Buyer pays" hotkey="3" onClick={actions.pay} enabled={can.pay} busy={busy === 'pay'} />
      <span aria-hidden="true" className="hidden w-px self-stretch bg-line lg:block" />
      <ActionButton
        icon="repeat" label="Duplicate webhook" hotkey="D" variant="quiet" grow={false}
        onClick={actions.replay} enabled={can.replay} busy={busy === 'replay'}
      />
      <ActionButton
        icon="skull" label="Forge webhook" hotkey="A" variant="danger" grow={false}
        onClick={actions.attack} enabled={can.attack} busy={busy === 'attack'}
      />
      <ActionButton
        icon="plus" label="New deal" hotkey="N" variant="quiet" grow={false}
        onClick={actions.newDeal} enabled busy={busy === 'newDeal'}
      />
    </section>
  );
}
