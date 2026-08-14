"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  isMode,
  isTheme,
  type Mode,
  type Theme,
} from "@/lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [mode, setModeState] = useState<Mode>(DEFAULT_MODE);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
    setThemeState(theme);
    // Always stamp the attribute, even for the default -- the CSS rules for
    // each theme/mode combo require both [data-theme] and [data-mode] to be
    // present, so an unset data-theme only ever matches the :root fallback.
    document.documentElement.dataset.theme = theme;

    const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
    const mode = isMode(storedMode) ? storedMode : DEFAULT_MODE;
    setModeState(mode);
    document.documentElement.dataset.mode = mode;
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    document.documentElement.dataset.theme = next;
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    localStorage.setItem(MODE_STORAGE_KEY, next);
    document.documentElement.dataset.mode = next;
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light");
  }, [mode, setMode]);

  return { theme, setTheme, mode, setMode, toggleMode };
}
