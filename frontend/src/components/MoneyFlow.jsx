import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { Amount } from './Amount.jsx';
import { compactMoney } from '../lib/format.js';

// How each live agent event moves money across the diagram.
function motionFor(event, invoiceId) {
  if (!event || event.data?.invoiceId !== invoiceId) return null;
  switch (event.type) {
    case 'deal_opened':
      return { arrows: { in: { label: compactMoney(event.data.advance) } }, pulse: 'escrow' };
    case 'tranche_released':
      return { arrows: { out: { label: `+${compactMoney(event.data.amount)}` } }, pulse: 'seller' };
    case 'buyer_paid':
      return { arrows: {}, pulse: 'seller' };
    case 'settled':
      return {
        arrows: { in: { label: compactMoney(event.data.repaymentDue), reverse: true }, out: { label: 'repay', reverse: true } },
        pulse: 'lender',
      };
    default:
      return null;
  }
}

function Arrow({ active, flight }) {
  return (
    <span className={`flow-arrow relative flex flex-none items-center justify-center px-2 transition-colors duration-500 ${active ? 'text-seller' : 'text-line-strong'}`}>
      <Icon name="arrow" size={24} strokeWidth={2.5} className={flight?.reverse ? 'rotate-180' : ''} />
      {flight && (
        <span
          key={flight.key}
          className={`${flight.reverse ? 'coin-reverse' : 'coin'} absolute -top-7 left-1/2 -ml-8 flex w-16 items-center justify-center gap-1 rounded-full bg-seller px-2 py-0.5 font-mono text-xs font-semibold whitespace-nowrap text-white shadow-md`}
        >
          {flight.label}
        </span>
      )}
    </span>
  );
}

function Node({ tone, icon, label, value, pulse, children }) {
  const tones = {
    lender: { box: 'bg-lender-soft', badge: 'bg-lender', text: 'text-lender-deep' },
    escrow: { box: 'border-2 border-dashed border-faint', badge: 'bg-ink', text: 'text-[#344054]' },
    seller: { box: 'bg-seller-soft', badge: 'bg-seller', text: 'text-seller-deep' },
  }[tone];
  return (
    <div key={pulse} className={`flex min-w-0 flex-[1_1_220px] flex-col gap-2.5 rounded-xl p-4 ${tones.box} ${pulse ? 'arrive' : ''}`}>
      <div className="flex items-center gap-3.5">
        <span className={`flex size-13 flex-none items-center justify-center rounded-xl text-white ${tones.badge}`}>
          <Icon name={icon} size={26} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className={`text-sm font-semibold ${tones.text}`}>{label}</span>
          <Amount value={value} className="text-[clamp(1.25rem,2.4vw,1.65rem)] font-semibold" />
        </span>
      </div>
      {children}
    </div>
  );
}

export function MoneyFlow({ deal, lenderFree, sellerBalance, latest }) {
  const [motion, setMotion] = useState(null);

  useEffect(() => {
    const next = motionFor(latest, deal?.invoiceId);
    if (!next) return undefined;
    setMotion({ ...next, key: latest.id });
    const done = setTimeout(() => setMotion(null), 1800);
    return () => clearTimeout(done);
  }, [latest, deal?.invoiceId]);

  const flight = (side) => (motion?.arrows[side] ? { ...motion.arrows[side], key: `${motion.key}-${side}` } : null);
  const pulse = (node) => (motion?.pulse === node ? motion.key : undefined);
  const escrowShare = deal.advanceAmount > 0 ? deal.escrow / deal.advanceAmount : 0;

  return (
    <section aria-label="Money flow" className="flex flex-col flex-wrap items-stretch justify-center gap-4 rounded-2xl border border-line bg-white p-[clamp(1rem,3vw,1.75rem)] md:flex-row md:items-center">
      <Node tone="lender" icon="bank" label="Lender · free funds" value={lenderFree} pulse={pulse('lender')} />
      <Arrow active={deal.status === 'active' && deal.releasedCount === 0} flight={flight('in')} />
      <Node tone="escrow" icon="vault" label="Escrow · locked for this deal" value={deal.escrow} pulse={pulse('escrow')}>
        <div role="img" aria-label={`${Math.round(escrowShare * 100)}% of the advance still in escrow`} className="h-2.5 overflow-hidden rounded-full bg-track">
          <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${escrowShare * 100}%` }} />
        </div>
      </Node>
      <Arrow active={deal.status === 'active' && deal.escrow > 0 && deal.releasedCount > 0} flight={flight('out')} />
      <Node tone="seller" icon="store" label="Seller · cash" value={sellerBalance} pulse={pulse('seller')}>
        {deal.awaitingAgent && (
          <span className="flex items-center gap-2 text-xs font-semibold text-seller">
            <Icon name="bot" size={14} /> Agent releasing tranche…
          </span>
        )}
      </Node>
    </section>
  );
}
