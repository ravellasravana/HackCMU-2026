"use client";
import { useEffect, useRef, useState } from "react";

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Smoothly animates a number to a new value whenever `target` changes.
 * Returns the current animated value.
 */
export function useAnimatedNumber(target: number, durationMs = 1200): number {
  const [current, setCurrent] = useState(target);
  const rafRef = useRef<number>(0);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (Math.abs(from - to) < 0.005) {
      setCurrent(to);
      prevRef.current = to;
      return;
    }
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / durationMs, 1);
      setCurrent(from + (to - from) * easeOutQuart(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);

  return current;
}
