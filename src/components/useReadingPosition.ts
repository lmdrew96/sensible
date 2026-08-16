"use client";

import { useCallback, useEffect, useState } from "react";
import { readingPositionKey } from "@/lib/reading-position";

export function useReadingPosition(slug: string) {
  const [savedSectionId, setSavedSectionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSavedSectionId(localStorage.getItem(readingPositionKey(slug)));
    setLoaded(true);
  }, [slug]);

  const recordPosition = useCallback(
    (sectionId: string) => {
      localStorage.setItem(readingPositionKey(slug), sectionId);
    },
    [slug],
  );

  return { savedSectionId, recordPosition, loaded };
}
