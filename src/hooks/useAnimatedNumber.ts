import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(target: number): number {
  const [displayed, setDisplayed] = useState(target);
  const displayedRef = useRef(target);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      displayedRef.current = target;
      setDisplayed(target);
      return;
    }

    const start = displayedRef.current;
    const difference = target - start;
    const startedAt = performance.now();
    const duration = 220;
    let frame = 0;

    const animate = (now: number) => {
      const elapsed = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const next = Math.round(start + difference * eased);
      displayedRef.current = next;
      setDisplayed(next);

      if (elapsed < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return displayed;
}
