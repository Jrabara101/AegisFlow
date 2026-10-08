import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const KEEP = 400;
const RETRY_MS = 3000;

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
    let source = null;
    let retry = null;
    let stopped = false;
    const backfill = () => api.activity().then((list) => setEntries((prev) => merge(prev, list)), () => {});

    const connect = () => {
      source = new EventSource(api.eventsUrl());
      // On a reconnect, backfill whatever was missed while disconnected.
      source.onopen = () => {
        setConnection('live');
        backfill();
      };
      source.onerror = () => {
        setConnection('reconnecting');
        // EventSource retries a dropped stream by itself, but gives up for
        // good when a retry gets an error response (the dev proxy answers
        // 5xx while the backend restarts). Open a new one in that case.
        if (source.readyState === EventSource.CLOSED && !stopped) {
          clearTimeout(retry);
          retry = setTimeout(connect, RETRY_MS);
        }
      };
      source.onmessage = (message) => {
        const entry = JSON.parse(message.data);
        setEntries((prev) => merge(prev, [entry]));
        setLatest(entry);
      };
    };

    connect();
    backfill();
    return () => {
      stopped = true;
      clearTimeout(retry);
      source?.close();
    };
  }, []);

  return { entries, connection, latest };
}
