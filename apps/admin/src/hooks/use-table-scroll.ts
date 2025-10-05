"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useTableScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  const checkScrollability = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollWidth, clientWidth, scrollLeft } = container;
    const isScrollableTable = scrollWidth > clientWidth;
    const maxScrollLeft = scrollWidth - clientWidth;

    setIsScrollable(isScrollableTable);
    setCanScrollLeft(scrollLeft > 10); // Small threshold to handle rounding
    setCanScrollRight(scrollLeft < maxScrollLeft - 10);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    checkScrollability();

    const handleScroll = () => {
      checkScrollability();
    };

    const handleResize = () => {
      checkScrollability();
    };

    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    // Use ResizeObserver to detect table content changes
    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });

    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [checkScrollability]);

  return {
    containerRef,
    canScrollLeft,
    canScrollRight,
    isScrollable,
  };
}
