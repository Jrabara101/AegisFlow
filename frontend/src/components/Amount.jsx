import { useCountUp } from '../hooks/useCountUp.js';
import { decimalsFor, money } from '../lib/format.js';

// A balance that counts towards its new value instead of jumping.
export function Amount({ value, className = '' }) {
  const shown = useCountUp(value);
  return <span className={`font-mono tabular-nums ${className}`}>{money(shown, decimalsFor(value))}</span>;
}
