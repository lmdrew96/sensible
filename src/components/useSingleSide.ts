"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SINGLE_SIDE, SINGLE_SIDE_STORAGE_KEY } from "@/lib/reader-single-side";

export function useSingleSide() {
  const [singleSide, setSingleSide] = useState(DEFAULT_SINGLE_SIDE);

  useEffect(() => {
    const stored = localStorage.getItem(SINGLE_SIDE_STORAGE_KEY);
    if (stored !== null) setSingleSide(stored === "true");
  }, []);

  const updateSingleSide = useCallback((next: boolean) => {
    setSingleSide(next);
    localStorage.setItem(SINGLE_SIDE_STORAGE_KEY, String(next));
  }, []);

  return { singleSide, setSingleSide: updateSingleSide };
}
