"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_READER_FONT,
  READER_FONT_STORAGE_KEY,
  isReaderFont,
  type ReaderFont,
} from "@/lib/reader-font";

function applyReaderFont(font: ReaderFont) {
  document.documentElement.dataset.readerFont = font;
}

export function useReaderFont() {
  const [font, setFont] = useState<ReaderFont>(DEFAULT_READER_FONT);

  useEffect(() => {
    const stored = localStorage.getItem(READER_FONT_STORAGE_KEY);
    if (isReaderFont(stored)) setFont(stored);
  }, []);

  const updateFont = useCallback((next: ReaderFont) => {
    setFont(next);
    localStorage.setItem(READER_FONT_STORAGE_KEY, next);
    applyReaderFont(next);
  }, []);

  return { font, setFont: updateFont };
}
