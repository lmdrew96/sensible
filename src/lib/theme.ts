export const THEMES = [
  { value: "henna", label: "Henna", swatch: "#CCB8BA", accent: "#7e7063" },
  { value: "sage", label: "Sage", swatch: "#B5C0B4", accent: "#727767" },
  { value: "indigo", label: "Indigo", swatch: "#ABC2CB", accent: "#6b7491" },
] as const;

export type Theme = (typeof THEMES)[number]["value"];
export const DEFAULT_THEME: Theme = "henna";
export const THEME_STORAGE_KEY = "sensible:theme";

export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];
export const DEFAULT_MODE: Mode = "light";
export const MODE_STORAGE_KEY = "sensible:mode";

export function isTheme(value: string | null): value is Theme {
  return THEMES.some((t) => t.value === value);
}

export function isMode(value: string | null): value is Mode {
  return MODES.includes(value as Mode);
}
