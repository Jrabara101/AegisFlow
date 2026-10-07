import { useCallback, useState } from 'react';
import { Icon } from './Icon.jsx';

const TONE = {
  ok: { box: 'border-ok/30 bg-ok-soft text-ok', icon: 'check' },
  blocked: { box: 'border-alert/40 bg-alert-soft text-alert', icon: 'shield' },
  error: { box: 'border-alert/40 bg-white text-alert', icon: 'alert' },
};

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((tone, title, detail) => {
    const id = crypto.randomUUID();
    setToasts((list) => [...list.slice(-2), { id, tone, title, detail }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5000);
  }, []);
  return { toasts, push };
}

export function Toasts({ toasts }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto">
      {toasts.map((t) => (
        <div key={t.id} className={`slide-in flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg ${TONE[t.tone].box}`}>
          <Icon name={TONE[t.tone].icon} className="mt-0.5 flex-none" />
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold">{t.title}</span>
            {t.detail && <span className="text-sm break-words text-ink/70">{t.detail}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
