import { ActivityLog } from '../src/activityLog.js';
import { templateIds } from '../src/ledger.js';

export const templates = templateIds('pkg');

// In-memory ActivityLog with console output silenced.
export function quietLog() {
  const log = new ActivityLog(null);
  const record = log.record.bind(log);
  log.record = (...args) => {
    const { log: original, error } = console;
    console.log = console.error = () => {};
    try {
      return record(...args);
    } finally {
      console.log = original;
      console.error = error;
    }
  };
  return log;
}

export const types = (log) => log.list().map((e) => e.type);
