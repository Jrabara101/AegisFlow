// Drives one invoice through its whole lifecycle against a running backend
// and prints what each party can see at the end. Usage:
//   npm run demo [-- INVOICE_ID]
const base = process.env.BACKEND_URL ?? 'http://localhost:4000';
const invoiceId = process.argv[2] ?? 'INV-2026-0091';
const waitMs = Number(process.env.DEMO_WAIT_MS ?? 3000); // > agent poll interval

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path) {
  const res = await fetch(`${base}${path}`, { method });
  const body = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${body.error ?? JSON.stringify(body)}`);
  return body;
}

async function step(title, fn) {
  console.log(`\n== ${title}`);
  const result = await fn();
  await sleep(waitMs);
  return result;
}

const seen = new Set((await call('GET', '/api/activity')).map((e) => e.id));
const printNewActivity = async () => {
  for (const e of await call('GET', '/api/activity')) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    console.log(`  ${e.actor.padEnd(7)} ${e.type.padEnd(18)} ${e.message}`);
  }
};

await step('Carrier: goods picked up (in_transit)', () => call('POST', `/demo/shipments/${invoiceId}/advance`));
await printNewActivity();

await step('Carrier retries the same webhook (must be ignored)', () => call('POST', `/demo/shipments/${invoiceId}/replay`));
await printNewActivity();

await step('Carrier: goods delivered', () => call('POST', `/demo/shipments/${invoiceId}/advance`));
await printNewActivity();

await step('Buyer pays the invoice; agent settles with the lender', () => call('POST', `/demo/invoices/${invoiceId}/buyer-payment`));
await printNewActivity();

console.log('\n== What each party can see now');
for (const role of ['seller', 'lender', 'oracle', 'outsider']) {
  const v = await call('GET', `/api/view/${role}`);
  console.log(`  ${role.padEnd(8)} balance ${v.balance.padStart(12)} | invoice details ${v.invoiceDetails.length}, invoices ${v.invoices.length}, agreements ${v.agreements.length}, attestations ${v.attestations.length}, cash holdings ${v.cashHoldings.length}`);
}
