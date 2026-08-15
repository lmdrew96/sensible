export const READER_SIZES = [
  { value: "small", label: "Small", fontSize: "0.9375rem" },
  { value: "medium", label: "Medium", fontSize: "1.0625rem" },
  { value: "large", label: "Large", fontSize: "1.25rem" },
] as const;

export type ReaderSize = (typeof READER_SIZES)[number]["value"];

export const DEFAULT_READER_SIZE: ReaderSize = "medium";
export const READER_SIZE_STORAGE_KEY = "sensible:reader-size";

export function isReaderSize(value: string | null): value is ReaderSize {
  return READER_SIZES.some((size) => size.value === value);
}
