import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { ROLES } from '../lib/visibility.js';

const POLL_MS = 3000;

// Every party's view of the ledger, refreshed on a timer and whenever the
// activity feed reports something new. status is one of:
//   loading | ok | ledger-down (backend up, JSON API not) | backend-down
export function useLedgerViews(changeSignal) {
  const [state, setState] = useState({ status: 'loading', views: null, error: null, updatedAt: 0 });
  const inFlight = useRef(false);
  const queued = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;
    try {
      const results = await Promise.all(ROLES.map((role) => api.view(role)));
      const views = Object.fromEntries(ROLES.map((role, i) => [role, results[i]]));
      setState({ status: 'ok', views, error: null, updatedAt: Date.now() });
    } catch (err) {
      const backendUp = await api.health().then(() => true, () => false);
      setState((prev) => ({ ...prev, status: backendUp ? 'ledger-down' : 'backend-down', error: err.message }));
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        load();
      }
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Agent work lands on the ledger a moment after its log entry.
  useEffect(() => {
    if (!changeSignal) return undefined;
    const soon = setTimeout(load, 250);
    return () => clearTimeout(soon);
  }, [changeSignal, load]);

  return { ...state, refresh: load };
}

export function useShipment(invoiceId, refreshKey) {
  const [shipment, setShipment] = useState(null);
  useEffect(() => {
    if (!invoiceId) return undefined;
    let cancelled = false;
    api.shipment(invoiceId).then((s) => !cancelled && setShipment(s), () => {});
    return () => { cancelled = true; };
  }, [invoiceId, refreshKey]);
  return shipment?.invoiceId === invoiceId ? shipment : null;
}

export function useLedgerInfo(ready) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!ready || info) return;
    api.ledgerInfo().then(setInfo, () => {});
  }, [ready, info]);
  return info;
}

// Settling archives the agreement, so keep the last copy of each one seen.
export function useRememberedAgreements(views) {
  const memory = useRef(new Map());
  for (const agreement of views?.seller.agreements ?? []) memory.current.set(agreement.invoiceId, agreement);
  return memory.current;
}
