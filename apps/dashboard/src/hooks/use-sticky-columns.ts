"use client";

import { useCallback, useEffect, useState } from "react";

// Lightweight sticky columns helper: measures the select header width to compute the left offset for the next sticky column.
export function useStickyColumns() {
  const [leftSelect] = useState<number>(0);
  const [leftDate, setLeftDate] = useState<number>(40); // fallback ~ w-10

  const measure = useCallback(() => {
    try {
      const th = document.querySelector<HTMLElement>('th[data-col-id="select"]');
      if (th) {
        const w = th.getBoundingClientRect().width;
        // Add 1px separator tolerance
        setLeftDate(Math.max(0, Math.round(w)));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  return { leftSelect, leftDate, measure };
}
