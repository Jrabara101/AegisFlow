import { Icon } from './Icon.jsx';
import { Amount } from './Amount.jsx';
import { CHIPS, contractsVisible } from '../lib/visibility.js';
import { cashOf } from '../lib/deal.js';
import { compactMoney, shortId, shortParty } from '../lib/format.js';

const ROLE_STYLE = {
  seller: { name: 'Seller', border: 'border-t-seller', text: 'text-seller' },
  lender: { name: 'Lender', border: 'border-t-lender', text: 'text-lender' },
  oracle: { name: 'Oracle', border: 'border-t-oracle', text: 'text-oracle' },
  outsider: { name: 'Outsider', border: 'border-t-outsider', text: 'text-outsider' },
};

function Segments({ label, segments }) {
  return (
    <div className="flex flex-col gap-2">
      <div role="img" aria-label={label} className="flex h-7 gap-1">
        {segments.map((s) => (
          <div key={s.key} className={`rounded-md transition-colors duration-700 ${s.className}`} style={{ flex: s.flex }} />
        ))}
      </div>
      <div className="flex gap-1 text-xs text-muted">
        {segments.map((s) => (
          <span key={s.key} className="min-w-0 truncate font-mono" style={{ flex: s.flex }}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

function sellerSegments(deal) {
  const retained = Math.max(0, deal.faceValue - deal.advanceAmount);
  return [
    ...deal.tranches.map((t) => ({
      key: `t${t.index}`,
      flex: t.amount,
      label: `T${t.index + 1} ${compactMoney(t.amount)}`,
      className: t.released || deal.status === 'settled' ? 'bg-seller' : 'bg-track',
    })),
    ...(retained > 0 ? [{ key: 'kept', flex: retained, label: compactMoney(retained), className: 'hatch' }] : []),
  ];
}

function lenderSegments(deal) {
  if (deal.status === 'settled' && deal.settlement) {
    return [
      { key: 'principal', flex: deal.settlement.principal, label: `Repaid ${compactMoney(deal.settlement.principal)}`, className: 'bg-lender' },
      { key: 'fee', flex: Math.max(deal.settlement.principal * 0.15, deal.settlement.fee), label: `+${compactMoney(deal.settlement.fee)}`, className: 'bg-lender-deep' },
    ];
  }
  return [
    { key: 'out', flex: Math.max(1, deal.releasedTotal), label: `Advanced ${compactMoney(deal.releasedTotal)}`, className: deal.releasedTotal > 0 ? 'bg-lender-mid' : 'bg-track' },
    ...(deal.escrow > 0 ? [{ key: 'escrow', flex: deal.escrow, label: `${compactMoney(deal.escrow)} escrow`, className: 'border-2 border-dashed border-lender-mid' }] : []),
    { key: 'fee', flex: deal.advanceAmount * 0.15, label: deal.feeAccrued > 0 ? compactMoney(deal.feeAccrued) : 'Fee', className: deal.feeAccrued > 0 ? 'bg-lender' : 'bg-track' },
  ];
}

function Chip({ chip, visible }) {
  return visible ? (
    <span title={`${chip.label}: visible to this party`} className="flex min-h-16 flex-[1_1_4rem] flex-col items-center justify-center gap-1 rounded-xl bg-ink text-xs font-semibold text-white">
      <Icon name={chip.icon} />
      {chip.label}
    </span>
  ) : (
    <span title={`${chip.label}: not on this party's node`} className="hatch flex min-h-16 flex-[1_1_4rem] flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold text-outsider">
      <Icon name="lock" />
      {chip.label}
    </span>
  );
}

// One party's private view of the same deal. Everything on the card comes
// from that party's own ledger query.
export function PartyCard({ role, view, deal, ctx }) {
  const style = ROLE_STYLE[role];
  const cash = cashOf(view);
  const contracts = contractsVisible(view, deal.invoiceId);
  const agreement = view.agreements.find((a) => a.invoiceId === deal.invoiceId);
  const details = view.invoiceDetails.find((d) => d.invoiceId === deal.invoiceId);

  return (
    <section className={`flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-2xl border border-t-[6px] border-line bg-white p-5 ${style.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className={`text-xl font-bold ${style.text}`}>{style.name}</h3>
          <span className="truncate font-mono text-xs text-faint" title={view.party}>{shortParty(view.party)}</span>
        </div>
        <Amount value={cash.total} className="text-[clamp(1.35rem,2.6vw,1.85rem)] font-semibold" />
      </div>

      {role === 'outsider' ? (
        <div className="hatch flex min-h-32 flex-1 flex-col items-center justify-center gap-2 rounded-xl">
          <Icon name="eyeOff" size={52} strokeWidth={1.6} className="text-outsider" />
          <span className="font-semibold text-[#344054]">Nothing to see</span>
          <span className="font-mono text-xs text-muted">same ledger · 0 contracts</span>
        </div>
      ) : (
        <Segments
          label={role === 'seller' ? 'Advance received' : 'Capital deployed and returned'}
          segments={role === 'seller' ? sellerSegments(deal) : lenderSegments(deal)}
        />
      )}

      {role === 'seller' && details && (
        <div className="flex items-center gap-2 rounded-lg bg-seller-soft px-3 py-2 text-sm">
          <Icon name="buyer" size={16} className="text-seller" />
          <span className="font-mono font-medium text-seller-deep">{details.buyerRef}</span>
          <span className="ml-auto text-xs text-muted">only here</span>
        </div>
      )}
      {role === 'lender' && !details && (
        <div className="hatch flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-outsider">
          <Icon name="lock" size={16} />
          <span className="font-mono">BUYER-REF-•••••</span>
          <span className="ml-auto text-xs">not on this node</span>
        </div>
      )}

      <div className="flex flex-1 flex-wrap content-stretch gap-2">
        {CHIPS.map((chip) => <Chip key={chip.key} chip={chip} visible={chip.sees(view, ctx)} />)}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-line pt-3 font-mono text-xs text-muted">
        <span><span className="font-semibold text-ink">{contracts}</span> contracts on this node</span>
        {agreement && <span title={agreement.contractId}>agreement {shortId(agreement.contractId)}</span>}
      </footer>
    </section>
  );
}
