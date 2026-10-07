import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ActivityLog } from '../src/activityLog.js';

test('reloads earlier entries from its file and skips a truncated line', () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'aegis-log-')), 'activity.jsonl');
  const first = new ActivityLog(file);
  const { log, error } = console;
  console.log = console.error = () => {};
  try {
    first.record('agent', 'settled', 'done', { invoiceId: 'INV-1' });
  } finally {
    console.log = log;
    console.error = error;
  }
  appendFileSync(file, '{"id":"cut');
  const second = new ActivityLog(file);
  assert.deepEqual(second.list().map((e) => e.type), ['settled']);
});
