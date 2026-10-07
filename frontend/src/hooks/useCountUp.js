import { useEffect, useRef, useState } from 'react';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Animates a number towards `target` so balance changes read as money moving.
export function useCountUp(target, ms = 900) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const start = from.current;
    if (start === target || reducedMotion()) {
      from.current = target;
      setValue(target);
      return undefined;
    }
    const began = performance.now();
    let frame;
    const step = (now) => {
      const t = Math.min(1, (now - began) / ms);
      const eased = 1 - (1 - t) ** 3;
      const current = start + (target - start) * eased;
      from.current = current;
      setValue(current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);

  return value;
}
