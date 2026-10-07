import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const KEEP = 400;

const merge = (current, incoming) => {
  const seen = new Set(current.map((e) => e.id));
  const added = incoming.filter((e) => !seen.has(e.id));
  if (added.length === 0) return current;
  return [...current, ...added].sort((a, b) => a.at.localeCompare(b.at)).slice(-KEEP);
};

// The agent activity log: history from /api/activity, then live entries
// over Server-Sent Events. `latest` is the newest entry that arrived live,
// which drives animations (history never animates).
export function useActivity() {
  const [entries, setEntries] = useState([]);
  const [connection, setConnection] = useState('connecting');
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    const backfill = () => api.activity().then((list) => setEntries((prev) => merge(prev, list)), () => {});
    const source = new EventSource(api.eventsUrl());
    // EventSource reconnects on its own; backfill whatever was missed.
    source.onopen = () => {
      setConnection('live');
      backfill();
    };
    source.onerror = () => setConnection('reconnecting');
    source.onmessage = (message) => {
      const entry = JSON.parse(message.data);
      setEntries((prev) => merge(prev, [entry]));
      setLatest(entry);
    };
    backfill();
    return () => source.close();
  }, []);

  return { entries, connection, latest };
}
