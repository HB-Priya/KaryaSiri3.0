import { useEffect, useState, useRef } from 'react';

export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const numericTarget = Number(target);
    if (!Number.isFinite(numericTarget)) {
      setValue(target); // non-numeric target (e.g. '—' before jobs load) — show as-is
      return undefined;
    }
    if (startedRef.current) {
      setValue(numericTarget); // already animated once; just snap to any later updates
      return undefined;
    }
    startedRef.current = true;
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(numericTarget);
      return undefined;
    }
    const start = performance.now();
    let frame;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * numericTarget));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
