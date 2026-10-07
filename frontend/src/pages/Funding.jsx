import { Icon } from '../components/Icon.jsx';
import { Amount } from '../components/Amount.jsx';
import { ROLES, ROLE_LABEL, visibilityMatrix } from '../lib/visibility.js';
import { clockTime, compactMoney, money, percent, shortDate, shortId } from '../lib/format.js';

const ROLE_TEXT = { seller: 'text-seller', lender: 'text-lender', oracle: 'text-oracle', outsider: 'text-outsider' };

function Card({ title, children, className = '' }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-white p-5 ${className}`}>
      {title && <h2 className="text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}

function AdvanceRing({ deal }) {
  const advanced = deal.status === 'settled' ? deal.settlement?.principal ?? deal.advanceAmount : deal.releasedTotal;
  const share = deal.faceValue > 0 ? advanced / deal.faceValue : 0;
  const target = deal.faceValue > 0 ? deal.advanceAmount / deal.faceValue : 0;
  return (
    <Card className="flex-[1_1_260px] items-center justify-center">
      <div
        role="img"
        aria-label={`${percent(share)} of face value advanced`}
        className="relative grid size-48 place-items-center rounded-full transition-all duration-700"
        style={{
          background: `conic-gradient(var(--color-seller) 0 ${share * 360}deg, var(--color-seller-ring) ${share * 360}deg ${target * 360}deg, var(--color-track) ${target * 360}deg 360deg)`,
        }}
      >
        <div className="grid size-36 place-items-center rounded-full bg-white">
          <div className="flex flex-col items-center">
            <span className="font-mono text-4xl font-semibold">{percent(share)}</span>
            <span className="text-sm font-semibold text-muted">advanced</span>
          </div>
        </div>
      </div>
      <span className="text-sm text-muted">target {percent(target)} of {money(deal.faceValue)} {deal.currency}</span>
    </Card>
  );
}

function Kpi({ icon, label, children, tone = 'text-ink' }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-ground p-4">
      <span className={`flex size-11 flex-none items-center justify-center rounded-xl bg-white ${tone}`}><Icon name={icon} /></span>
      <span className="flex min-w-0 flex-col">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <span className="truncate text-xl font-semibold">{children}</span>
      </span>
    </div>
  );
}

function Kpis({ deal }) {
  const settled = deal.status === 'settled' && deal.settlement;
  return (
    <Card className="flex-[3_1_520px]">
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi icon="invoice" label="Face value"><Amount value={deal.faceValue} /></Kpi>
        <Kpi icon="cash" label="Advanced to seller" tone="text-seller">
          <Amount value={settled ? deal.settlement.principal : deal.releasedTotal} />
        </Kpi>
        <Kpi icon="bank" label={settled ? 'Fee paid' : 'Fee accrued'} tone="text-lender">
          <Amount value={settled ? deal.settlement.fee : deal.feeAccrued} />
        </Kpi>
        <Kpi icon="vault" label={settled ? 'Repaid to lender' : 'Repayment due'} tone="text-lender">
          <Amount value={settled ? deal.settlement.repaid : deal.repaymentDue} />
        </Kpi>
        <Kpi icon="terms" label="Discount rate"><span className="font-mono">{percent(deal.discountRate)} p.a.</span></Kpi>
        <Kpi icon="clock" label="Due date">{deal.dueDate ? shortDate(deal.dueDate) : '—'}</Kpi>
      </div>
    </Card>
  );
}

// Where the face value ends up once the buyer pays: the seller keeps all
// but the fee, the lender earns the fee. Fee is the ledger's own number.
function Split({ deal }) {
  const fee = deal.status === 'settled' && deal.settlement ? deal.settlement.fee : deal.feeAccrued;
  const sellerNet = Math.max(0, deal.faceValue - fee);
  const feeFlex = Math.max(fee, deal.faceValue * 0.02);
  return (
    <Card title={`Where the ${money(deal.faceValue)} goes`}>
      <div role="img" aria-label={`Seller keeps ${money(sellerNet)}, lender earns ${money(fee)}`} className="flex h-12 gap-1">
        <div className="flex items-center rounded-lg bg-seller px-4 font-mono font-semibold text-white transition-all duration-700" style={{ flex: sellerNet }}>
          <Icon name="store" size={18} className="mr-2" />{money(sellerNet)}
        </div>
        <div className={`flex items-center justify-center rounded-lg font-mono text-sm font-semibold text-white transition-all duration-700 ${fee > 0 ? 'bg-lender' : 'hatch text-outsider'}`} style={{ flex: feeFlex }}>
          {compactMoney(fee)}
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
        <span><span className="font-semibold text-seller">Seller keeps</span> face value minus fee</span>
        <span><span className="font-semibold text-lender">Lender earns</span> {deal.status === 'settled' ? 'the fee' : 'the fee accrued so far'}</span>
      </div>
    </Card>
  );
}

function Tranches({ deal }) {
  return (
    <Card title="Tranches" className="flex-[1_1_300px]">
      <ol className="flex flex-1 flex-col gap-3">
        {deal.tranches.map((t) => {
          const done = t.released || deal.status === 'settled';
          return (
            <li key={t.index} className={`flex flex-1 items-center gap-4 rounded-xl border p-4 ${done ? 'border-seller bg-seller-soft' : t.next ? 'border-dashed border-seller' : 'border-line'}`}>
              <span className={`flex size-12 flex-none items-center justify-center rounded-xl ${done ? 'bg-seller text-white' : 'bg-ground text-faint'}`}>
                <Icon name={done ? 'check' : t.milestone === 'Shipped' ? 'truck' : 'box'} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">T{t.index + 1} · {t.milestone}</span>
                <span className="font-mono text-xs text-muted">{percent(t.fraction)} of face</span>
              </span>
              <span className="font-mono text-lg font-semibold">{compactMoney(t.amount)}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function Seals({ deal }) {
  return (
    <Card title="Oracle seals" className="flex-[1_1_300px]">
      <ol className="flex flex-1 flex-col gap-3">
        {deal.attestations.length === 0 && (
          <li className="hatch flex flex-1 flex-col items-center justify-center gap-2 rounded-xl p-6 text-sm font-semibold text-outsider">
            <Icon name="seal" size={32} strokeWidth={1.6} />
            No milestone attested yet
          </li>
        )}
        {deal.attestations.map((a) => (
          <li key={a.contractId} className="flex flex-1 items-center gap-4 rounded-xl border border-oracle/30 bg-oracle-soft p-4">
            <span className="flex size-12 flex-none items-center justify-center rounded-full bg-oracle text-white">
              <Icon name="seal" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold text-oracle">{a.milestone} · {clockTime(a.attestedAt)}</span>
              <span className="truncate font-mono text-xs text-muted" title={a.evidenceHash}>{shortId(a.evidenceHash, 15, 6)}</span>
              <span className="truncate font-mono text-xs text-faint" title={a.contractId}>cid {shortId(a.contractId, 10, 6)}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Matrix({ views, ctx }) {
  const rows = visibilityMatrix(views, ctx);
  return (
    <Card title="Who sees what" className="flex-[2_1_440px]">
      <div className="flex flex-1 flex-col overflow-x-auto">
        <table className="w-full min-w-[420px] flex-1 border-separate border-spacing-y-1.5 text-sm">
          <thead>
            <tr>
              <th className="sr-only">Data</th>
              {ROLES.map((r) => <th key={r} className={`pb-1 text-center font-semibold ${ROLE_TEXT[r]}`}>{ROLE_LABEL[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="pr-3 text-left font-medium">
                  <span className="flex items-center gap-2"><Icon name={row.icon} size={16} className="text-muted" />{row.label}</span>
                </th>
                {ROLES.map((r) => (
                  <td key={r} className="px-1 text-center">
                    {row.cells[r] ? (
                      <span className="inline-flex h-9 w-full max-w-24 items-center justify-center rounded-lg bg-ink text-white" title={`${ROLE_LABEL[r]} sees this`}>
                        <Icon name="check" size={18} />
                      </span>
                    ) : (
                      <span className="hatch inline-flex h-9 w-full max-w-24 items-center justify-center rounded-lg text-outsider" title={`Not on the ${ROLE_LABEL[r].toLowerCase()}'s node`}>
                        <Icon name="lock" size={16} />
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Each column is that party's own ledger query, live.</p>
    </Card>
  );
}

export function Funding({ deal, views, ctx }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-stretch gap-4">
        <AdvanceRing deal={deal} />
        <Kpis deal={deal} />
      </div>
      <Split deal={deal} />
      <div className="flex flex-1 flex-wrap items-stretch gap-4">
        <Tranches deal={deal} />
        <Seals deal={deal} />
        <Matrix views={views} ctx={ctx} />
      </div>
    </div>
  );
}
