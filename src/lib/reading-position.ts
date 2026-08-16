const STORAGE_PREFIX = "sensible:reading-position:";

export function readingPositionKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug}`;
}
