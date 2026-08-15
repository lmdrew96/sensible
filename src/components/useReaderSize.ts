"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_READER_SIZE,
  READER_SIZE_STORAGE_KEY,
  isReaderSize,
  type ReaderSize,
} from "@/lib/reader-size";

function applyReaderSize(size: ReaderSize) {
  document.documentElement.dataset.readerSize = size;
}

export function useReaderSize() {
  const [size, setSize] = useState<ReaderSize>(DEFAULT_READER_SIZE);

  useEffect(() => {
    const stored = localStorage.getItem(READER_SIZE_STORAGE_KEY);
    if (isReaderSize(stored)) setSize(stored);
  }, []);

  const updateSize = useCallback((next: ReaderSize) => {
    setSize(next);
    localStorage.setItem(READER_SIZE_STORAGE_KEY, next);
    applyReaderSize(next);
  }, []);

  return { size, setSize: updateSize };
}
