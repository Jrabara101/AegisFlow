import { Icon } from './Icon.jsx';
import { TONE_BADGE } from '../lib/events.js';
import { clockTime } from '../lib/format.js';

export function EventCard({ event, highlight = false, showTime = false, className = '' }) {
  const ring = event.blocked || event.attack
    ? 'border-alert/40'
    : highlight
      ? 'border-seller ring-3 ring-seller-ring'
      : 'border-line';
  return (
    <li className={`slide-in flex min-w-0 items-center gap-3 rounded-xl border bg-white px-3.5 py-3 ${ring} ${className}`}>
      <span className={`flex size-9 flex-none items-center justify-center rounded-lg ${TONE_BADGE[event.tone]}`}>
        <Icon name={event.icon} size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold" title={event.message}>{event.title}</span>
        <span className="truncate font-mono text-xs text-muted">{event.detail || event.actor}</span>
      </span>
      {showTime && <time className="flex-none font-mono text-xs text-faint" dateTime={event.at}>{clockTime(event.at)}</time>}
    </li>
  );
}
