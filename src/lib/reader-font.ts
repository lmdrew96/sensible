// cssVar points at the real CSS custom property next/font/local declares
// for that font (see src/fonts.ts). Tailwind's `@theme inline` tokens
// (--font-reader-serif etc., used for the font-reader-* utility classes)
// are NOT emitted as standalone custom properties -- inline only folds
// them into the generated utility rule -- so `var(--font-reader-serif)`
// in a plain style prop resolves to nothing. Reference the underlying var
// directly instead.
export const READER_FONTS = [
  { value: "serif", label: "Serif", sample: "Arvo", cssVar: "--font-typewriter" },
  { value: "sans", label: "Sans", sample: "Jost", cssVar: "--font-avenir" },
  { value: "mono", label: "Mono", sample: "Brass Mono", cssVar: "--font-brassmono" },
  { value: "dyslexic-a", label: "Dyslexic A", sample: "Cadman", cssVar: "--font-cadman" },
  { value: "dyslexic-b", label: "Dyslexic B", sample: "OpenDyslexic", cssVar: "--font-opendyslexic" },
] as const;

export type ReaderFont = (typeof READER_FONTS)[number]["value"];

export const DEFAULT_READER_FONT: ReaderFont = "serif";
export const READER_FONT_STORAGE_KEY = "sensible:reader-font";

export function isReaderFont(value: string | null): value is ReaderFont {
  return READER_FONTS.some((font) => font.value === value);
}
