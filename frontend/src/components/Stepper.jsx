import { Icon } from './Icon.jsx';
import { STEPS } from '../lib/deal.js';

const STEP_ICON = ['doc', 'truck', 'box', 'cash'];

export function Stepper({ step, working }) {
  return (
    <ol aria-label="Deal progress" className="flex w-full max-w-3xl items-center">
      {STEPS.map((label, i) => {
        const done = i < step || (i === 3 && step === 3);
        const current = i === step && step < 3;
        return (
          <li key={label} className="contents">
            {i > 0 && (
              <span aria-hidden="true" className={`mx-1.5 mb-6 h-[3px] flex-1 rounded-full transition-colors duration-500 ${i <= step ? 'bg-ink' : 'bg-line'}`} />
            )}
            <span className="flex flex-none flex-col items-center gap-1.5" aria-current={current ? 'step' : undefined}>
              <span
                className={`flex size-11 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                  done
                    ? 'border-ink bg-ink text-white'
                    : current
                      ? `border-seller bg-white text-seller ring-4 ring-seller-ring ${working ? 'animate-pulse' : ''}`
                      : 'border-line-strong bg-white text-faint'
                }`}
              >
                <Icon name={done && i !== 3 ? 'check' : STEP_ICON[i]} size={20} />
              </span>
              <span className={`text-sm font-semibold ${i <= step ? 'text-ink' : 'text-faint'}`}>{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
