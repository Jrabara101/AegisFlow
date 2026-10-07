// Stroke icons matching the design mockups (24px grid, currentColor).
const PATHS = {
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8 13c1.7-2.5 3.4 1.7 5.1-.8S15.6 10.5 16.5 11.3" /></>,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></>,
  invoice: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 13h6M9 17h4" /></>,
  terms: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12l2 2 4-4" /></>,
  truck: <><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  box: <><path d="M4 8l8-4 8 4v8l-8 4-8-4z" /><path d="M9 12l2 2 4-4" /></>,
  cash: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>,
  bank: <><path d="M3 10l9-6 9 6" /><path d="M5 10v8M9 10v8M15 10v8M19 10v8" /><path d="M3 20h18" /></>,
  store: <><path d="M4 10v10h16V10" /><path d="M3 10l2-6h14l2 6" /><path d="M9 20v-6h6v6" /></>,
  vault: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="12" r="4" /><path d="M12 8v1M12 15v1M8 12h1M15 12h1" /></>,
  buyer: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 14.5-4 16 0" /></>,
  seal: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  bot: <><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 4v4" /><circle cx="9.5" cy="13" r="1" /><circle cx="14.5" cy="13" r="1" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  eyeOff: <><path d="M3 12c3-5 15-5 18 0-3 5-15 5-18 0z" /><circle cx="12" cy="12" r="3" /><path d="M4 4l16 16" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  reset: <><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v4h4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  repeat: <><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
  skull: <><path d="M12 3a8 8 0 0 0-8 8c0 3 1.5 4.5 3 5.5V20h10v-3.5c1.5-1 3-2.5 3-5.5a8 8 0 0 0-8-8z" /><circle cx="9" cy="11" r="1.5" /><circle cx="15" cy="11" r="1.5" /><path d="M10 20v-2M14 20v-2" /></>,
  arrow: <path d="M2 12h34M28 4l8 8-8 8" />,
  ledger: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  keyboard: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>,
  presenter: <><rect x="3" y="4" width="18" height="12" rx="1" /><path d="M12 16v4M8 20h8" /></>,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  plug: <><path d="M9 2v6M15 2v6" /><path d="M6 8h12v4a6 6 0 0 1-12 0z" /><path d="M12 18v4" /></>,
};

export function Icon({ name, size = 20, strokeWidth = 2, className = '' }) {
  const wide = name === 'arrow';
  return (
    <svg
      width={wide ? size * (40 / 24) : size}
      height={size}
      viewBox={wide ? '0 0 40 24' : '0 0 24 24'}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
