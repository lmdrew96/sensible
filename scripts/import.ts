/**
 * One-time content import: pulls the v1 text library from Project Gutenberg
 * (via Gutendex), chunks each into paragraph-aligned sections, and inserts
 * them into Convex as unreviewed (status "pending") sections. Run once per
 * text library change, not at request time.
 *
 * Usage: pnpm import
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` once first, or source .env.local.",
  );
}
const client = new ConvexHttpClient(CONVEX_URL);

type DifficultyType = "vocabulary" | "syntax" | "poetic";

type FetchStrategy =
  | { type: "whole"; gutenbergId: number; startAfter?: string }
  | { type: "merge"; parts: { gutenbergId: number; startAfter?: string }[] }
  | { type: "extract"; gutenbergId: number; startMarker: string; endMarker: string };

interface TextConfig {
  title: string;
  slug: string;
  author: string;
  year: string;
  difficultyType: DifficultyType;
  isTranslation: boolean;
  translationNote?: string;
  libraryOrder: number;
  fetch: FetchStrategy;
}

const TEXTS: TextConfig[] = [
  {
    title: "Common Sense",
    slug: "common-sense",
    author: "Thomas Paine",
    year: "1776",
    difficultyType: "vocabulary",
    isTranslation: false,
    libraryOrder: 1,
    fetch: { type: "whole", gutenbergId: 147 },
  },
  {
    title: "The Declaration of Independence",
    slug: "declaration-of-independence",
    author: "Thomas Jefferson",
    year: "1776",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 2,
    fetch: { type: "whole", gutenbergId: 1 },
  },
  {
    title: "Macbeth",
    slug: "macbeth",
    author: "William Shakespeare",
    year: "1606",
    difficultyType: "poetic",
    isTranslation: false,
    libraryOrder: 3,
    fetch: { type: "whole", gutenbergId: 1533 },
  },
  {
    title: "Pride and Prejudice",
    slug: "pride-and-prejudice",
    author: "Jane Austen",
    year: "1813",
    difficultyType: "vocabulary",
    isTranslation: false,
    libraryOrder: 4,
    fetch: { type: "whole", gutenbergId: 1342 },
  },
  {
    title: "Jane Eyre",
    slug: "jane-eyre",
    author: "Charlotte Brontë",
    year: "1847",
    difficultyType: "vocabulary",
    isTranslation: false,
    libraryOrder: 5,
    fetch: { type: "whole", gutenbergId: 1260 },
  },
  {
    title: "Walden",
    slug: "walden",
    author: "Henry David Thoreau",
    year: "1854",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 6,
    // The standalone Gutenberg "Walden" (#26289) text/plain format points at
    // a readme, not the book. Use the bundled edition (#205) and extract
    // just Walden, excluding the appended "Civil Disobedience" essay.
    fetch: {
      type: "extract",
      gutenbergId: 205,
      startMarker: "When I wrote the following pages",
      endMarker: "ON THE DUTY OF CIVIL DISOBEDIENCE",
    },
  },
  {
    title: "The U.S. Constitution & Bill of Rights",
    slug: "us-constitution",
    author: "United States",
    year: "1787–1791",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 7,
    // Gutenberg splits these into two separate texts; #5 explicitly excludes
    // the amendments, so the Bill of Rights (#2) is fetched and appended.
    // #5's own text also carries a paragraph of the transcriber's editorial
    // notes after the license marker -- skip past it to the actual text.
    fetch: {
      type: "merge",
      parts: [
        { gutenbergId: 5, startAfter: "We the people of the United States" },
        { gutenbergId: 2 },
      ],
    },
  },
  {
    title: "The Communist Manifesto",
    slug: "communist-manifesto",
    author: "Karl Marx & Friedrich Engels",
    year: "1848",
    difficultyType: "syntax",
    isTranslation: true,
    translationNote: "English translation (Samuel Moore, 1888, authorized by Engels)",
    libraryOrder: 8,
    fetch: { type: "whole", gutenbergId: 31193 },
  },
  {
    title: "Self-Reliance",
    slug: "self-reliance",
    author: "Ralph Waldo Emerson",
    year: "1841",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 9,
    // Self-Reliance has no standalone Gutenberg edition -- it's the second
    // essay in "Essays, First Series" (#2944). Extract just that essay.
    fetch: {
      type: "extract",
      gutenbergId: 2944,
      startMarker: "SELF-RELIANCE",
      endMarker: "COMPENSATION",
    },
  },
  {
    title: "The Metamorphosis",
    slug: "the-metamorphosis",
    author: "Franz Kafka",
    year: "1915",
    difficultyType: "vocabulary",
    isTranslation: true,
    translationNote: "original English translation (David Wyllie)",
    libraryOrder: 10,
    fetch: { type: "whole", gutenbergId: 5200 },
  },
];

async function fetchGutenbergPlainText(gutenbergId: number): Promise<string> {
  const meta = await fetch(`https://gutendex.com/books/${gutenbergId}`);
  if (!meta.ok) throw new Error(`Gutendex lookup failed for id ${gutenbergId}: ${meta.status}`);
  const book = (await meta.json()) as { formats: Record<string, string> };
  const url =
    book.formats["text/plain; charset=utf-8"] ??
    book.formats["text/plain; charset=us-ascii"] ??
    book.formats["text/plain"];
  if (!url) throw new Error(`No plain-text format for Gutenberg id ${gutenbergId}`);
  const textRes = await fetch(url);
  if (!textRes.ok) throw new Error(`Failed to fetch text for id ${gutenbergId}: ${textRes.status}`);
  return await textRes.text();
}

function stripBoilerplate(raw: string): string {
  const startMatch = raw.match(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  const endMatch = raw.match(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  const start = startMatch ? startMatch.index! + startMatch[0].length : 0;
  const end = endMatch ? endMatch.index! : raw.length;
  return raw.slice(start, end).trim();
}

function chunkIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 0);
}

async function fetchAndTrim(gutenbergId: number, startAfter?: string): Promise<string> {
  const raw = await fetchGutenbergPlainText(gutenbergId);
  const body = stripBoilerplate(raw);
  if (!startAfter) return body;
  const idx = body.indexOf(startAfter);
  if (idx === -1) throw new Error(`startAfter marker "${startAfter}" not found`);
  return body.slice(idx).trim();
}

async function resolveBody(fetchStrategy: FetchStrategy): Promise<string> {
  switch (fetchStrategy.type) {
    case "whole":
      return await fetchAndTrim(fetchStrategy.gutenbergId, fetchStrategy.startAfter);
    case "merge": {
      const parts = await Promise.all(
        fetchStrategy.parts.map((p) => fetchAndTrim(p.gutenbergId, p.startAfter)),
      );
      return parts.join("\n\n");
    }
    case "extract": {
      const raw = stripBoilerplate(await fetchGutenbergPlainText(fetchStrategy.gutenbergId));
      const firstStart = raw.indexOf(fetchStrategy.startMarker);
      if (firstStart === -1) {
        throw new Error(`Start marker "${fetchStrategy.startMarker}" not found`);
      }
      // The first occurrence is usually a table-of-contents entry; the
      // second is the essay's actual heading.
      const secondStart = raw.indexOf(fetchStrategy.startMarker, firstStart + 1);
      const start = secondStart === -1 ? firstStart : secondStart;
      const end = raw.indexOf(fetchStrategy.endMarker, start);
      if (end === -1) {
        throw new Error(`End marker "${fetchStrategy.endMarker}" not found after start`);
      }
      return raw.slice(start, end).trim();
    }
  }
}

async function importText(config: TextConfig) {
  console.log(`Importing "${config.title}"...`);
  const body = await resolveBody(config.fetch);
  const paragraphs = chunkIntoParagraphs(body);

  const sourceUrl =
    config.fetch.type === "merge"
      ? `https://www.gutenberg.org/ebooks/${config.fetch.parts[0].gutenbergId}`
      : `https://www.gutenberg.org/ebooks/${config.fetch.gutenbergId}`;

  const textId = await client.mutation(api.texts.create, {
    title: config.title,
    slug: config.slug,
    author: config.author,
    year: config.year,
    sourceUrl,
    difficultyType: config.difficultyType,
    isTranslation: config.isTranslation,
    translationNote: config.translationNote,
    libraryOrder: config.libraryOrder,
  });

  for (let i = 0; i < paragraphs.length; i++) {
    await client.mutation(api.sections.create, {
      textId,
      order: i,
      original: paragraphs[i],
    });
  }

  console.log(`  -> ${paragraphs.length} sections`);
}

async function main() {
  for (const config of TEXTS) {
    try {
      await importText(config);
    } catch (err) {
      console.error(`FAILED "${config.title}":`, err);
    }
  }
}

main();
