export const READER_FONTS = [
  { value: "serif", label: "Serif", sample: "Arvo" },
  { value: "sans", label: "Sans", sample: "Jost" },
  { value: "mono", label: "Mono", sample: "Brass Mono" },
  { value: "dyslexic-a", label: "Dyslexic A", sample: "Cadman" },
  { value: "dyslexic-b", label: "Dyslexic B", sample: "OpenDyslexic" },
] as const;

export type ReaderFont = (typeof READER_FONTS)[number]["value"];

export const DEFAULT_READER_FONT: ReaderFont = "serif";
export const READER_FONT_STORAGE_KEY = "sensible:reader-font";

export function isReaderFont(value: string | null): value is ReaderFont {
  return READER_FONTS.some((font) => font.value === value);
}
