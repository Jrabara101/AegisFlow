// Ledger decimals arrive as strings ("60000.0000000000").
export const num = (value) => Number(value ?? 0);

// Two decimals only when the amount has cents, so 98,300 stays clean but a
// real-time fee like 1,799.94 is shown exactly.
export const decimalsFor = (value) => (Math.round(num(value) * 100) % 100 === 0 ? 0 : 2);

export function money(value, decimals = decimalsFor(value)) {
  return num(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// 60000 -> "60k", 1799.94 -> "1.8k", 950 -> "950".
export function compactMoney(value) {
  const n = num(value);
  if (Math.abs(n) < 1000) return money(n);
  return `${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`;
}

export const percent = (fraction) => `${Math.round(num(fraction) * 100)}%`;

// Contract ids are long hex strings; show enough to match against logs.
export function shortId(id, head = 6, tail = 4) {
  if (!id) return '—';
  return id.length <= head + tail + 1 ? id : `${id.slice(0, head)}…${tail > 0 ? id.slice(-tail) : ''}`;
}

// "Seller::1220abcd…" -> "Seller"
export const partyName = (party) => (party ? party.split('::')[0] : '—');

export function shortParty(party) {
  if (!party) return '—';
  const [name, fingerprint] = party.split('::');
  return fingerprint ? `${name}::${fingerprint.slice(0, 4)}…${fingerprint.slice(-4)}` : party;
}

export const clockTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour12: false });

export const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function daysUntil(iso, now = Date.now()) {
  return Math.max(0, Math.round((Date.parse(iso) - now) / 86400000));
}

// Sums ledger decimals in cents so 60000 + 30000.0000000001 never drifts.
export const sumAmounts = (values) => values.reduce((cents, v) => cents + Math.round(num(v) * 100), 0) / 100;
