import { appendFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

// Timestamped record of every decision the carrier, oracle and agent make.
// Kept in memory for the API, appended to a JSONL file for audit, and
// pushed to live subscribers (the dashboard's agent feed).
export class ActivityLog {
  constructor(file) {
    this.file = file;
    this.entries = [];
    this.subscribers = new Set();
    if (file) mkdirSync(path.dirname(file), { recursive: true });
  }

  // actor: 'carrier' | 'oracle' | 'agent'; level: 'info' | 'warn' | 'error'
  record(actor, type, message, data = {}, level = 'info') {
    const entry = { id: randomUUID(), at: new Date().toISOString(), actor, type, level, message, data };
    this.entries.push(entry);
    if (this.file) appendFileSync(this.file, `${JSON.stringify(entry)}\n`);
    for (const notify of this.subscribers) notify(entry);
    const line = `[${entry.at}] ${actor.padEnd(7)} ${type}: ${message}`;
    (level === 'error' ? console.error : console.log)(line);
    return entry;
  }

  list({ limit = 100 } = {}) {
    return this.entries.slice(-limit);
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
}
