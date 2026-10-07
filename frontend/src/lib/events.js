import { money, shortId } from './format.js';

const STATUS_LABEL = { in_transit: 'In transit', delivered: 'Delivered', receipt_confirmed: 'Receipt confirmed' };

// Defences doing their job: shown as blocked attempts, not failures.
export const BLOCKED_TYPES = new Set(['webhook_rejected', 'duplicate_ignored']);

const CASH_TYPES = new Set(['tranche_released', 'buyer_paid', 'settled', 'deal_opened']);

// Turns an activity-log entry into a short visual card: icon, tone, a
// title of a few words and one line of proof (hash, contract id, amount).
export function describe(entry) {
  const d = entry.data ?? {};
  const blocked = BLOCKED_TYPES.has(entry.type);
  const failed = entry.level === 'error';
  const attack = entry.type === 'forged_webhook';

  let kind = entry.actor === 'carrier' ? 'carrier' : entry.actor === 'oracle' ? 'oracle' : 'bot';
  if (CASH_TYPES.has(entry.type)) kind = 'cash';

  let title = entry.message;
  let detail = '';
  switch (entry.type) {
    case 'status_changed': {
      const status = entry.message.match(/now (\w+)$/)?.[1];
      title = STATUS_LABEL[status] ?? 'Status changed';
      detail = d.trackingNumber ?? '';
      break;
    }
    case 'webhook_retried': title = 'Webhook re-sent'; detail = `event ${shortId(d.eventId, 8, 0)}`; break;
    case 'forged_webhook': title = 'Forged webhook sent'; detail = 'wrong signature'; break;
    case 'webhook_rejected': title = 'Forgery rejected'; detail = 'HMAC check failed · 401'; break;
    case 'duplicate_ignored': title = 'Duplicate ignored'; detail = `event ${shortId(d.eventId, 8, 0)}`; break;
    case 'status_ignored': title = 'Status not attestable'; break;
    case 'milestone_attested': title = `${d.milestone} signed`; detail = shortId(d.evidenceHash, 13, 4); break;
    case 'attestation_failed': title = 'Attestation failed'; break;
    case 'tranche_released': title = `+${money(d.amount)} to seller`; detail = `Tranche ${d.tranche} · ${d.milestone}`; break;
    case 'buyer_paid': title = `Buyer paid ${money(entry.message.match(/paid ([\d.]+)/)?.[1])}`; detail = 'off-ledger, credited as stablecoin'; break;
    case 'settled': title = `${money(d.repaymentDue)} to lender`; detail = `principal ${money(d.principal)} + fee ${money(d.fee)}`; break;
    case 'deal_opened': title = 'Deal opened'; detail = `${money(d.advance)} escrowed`; break;
    case 'started': title = 'Agent watching'; detail = 'polling attestations'; break;
    case 'no_release': title = 'Nothing to release'; break;
    case 'no_agreement': title = 'No agreement'; break;
    case 'poll_failed': title = 'Ledger read failed'; break;
    case 'release_failed': title = 'Release failed'; break;
    default: break;
  }

  return {
    ...entry,
    kind,
    title,
    detail,
    blocked,
    failed,
    attack,
    tone: failed ? 'error' : blocked ? 'blocked' : attack ? 'attack' : kind,
    icon: blocked ? 'shield' : attack ? 'skull' : failed ? 'alert' : { carrier: 'truck', oracle: 'seal', cash: 'cash', bot: 'bot' }[kind],
  };
}

// Tailwind classes for each tone's icon badge.
export const TONE_BADGE = {
  carrier: 'bg-track text-ink',
  oracle: 'bg-oracle-soft text-oracle',
  cash: 'bg-seller-ring text-seller-deep',
  bot: 'bg-ground text-[#344054]',
  blocked: 'bg-alert-soft text-alert',
  attack: 'bg-alert text-white',
  error: 'bg-alert text-white',
};

export function aboutInvoice(entry, invoiceId) {
  return entry.data?.invoiceId === invoiceId || entry.message.includes(invoiceId);
}
