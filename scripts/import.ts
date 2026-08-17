/**
 * One-time content import: pulls the v1 text library from clean, structured
 * sources -- Standard Ebooks (literary works), the National Archives
 * (founding documents), and Wikisource (Common Sense, which neither of the
 * above carries) -- chunks each into paragraph-aligned sections, and inserts
 * them into Convex as unreviewed (status "pending") sections. Run once per
 * text library change, not at request time.
 *
 * Why not Gutendex/Gutenberg plaintext for everything: Gutenberg's plaintext
 * editions preserve a printer's blank-line layout, not real paragraph
 * semantics -- a signature block or table can land on its own blank-line
 * "paragraph" mid-sentence, silently truncating a section (see
 * mergeDanglingFragments below for the defense-in-depth fix). Structured
 * sources give real paragraph boundaries via <p> tags instead. The
 * Metamorphosis has no Standard Ebooks edition, so it stays on Gutenberg.
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

const USER_AGENT = "sensible-import-script/1.0 (https://github.com/lmdrew96; text modernizer app)";

type DifficultyType = "vocabulary" | "syntax" | "poetic";

type FetchStrategy =
  | { type: "standardEbooksProse"; repo: string; files: string[] }
  | { type: "standardEbooksDrama"; repo: string; files: string[] }
  | { type: "archives"; parts: { url: string; startMarker: string; endMarker?: string }[] }
  | { type: "wikisource"; pages: string[] }
  | { type: "gutenberg"; gutenbergId: number; startAfter?: string };

interface TextConfig {
  title: string;
  slug: string;
  author: string;
  year: string;
  sourceUrl: string;
  difficultyType: DifficultyType;
  isTranslation: boolean;
  translationNote?: string;
  libraryOrder: number;
  fetch: FetchStrategy;
}

function chapterFiles(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `chapter-${i + 1}.xhtml`);
}

// A section's text, plus the character speaking it (drama sources only).
// Kept as structured data rather than baked into the text itself -- the UI
// renders the "Speaker:" prefix, so it's never subject to an LLM's
// inconsistent handling of it during modernization.
interface Paragraph {
  text: string;
  speaker?: string;
}

const TEXTS: TextConfig[] = [
  {
    title: "Common Sense",
    slug: "common-sense",
    author: "Thomas Paine",
    year: "1776",
    sourceUrl: "https://en.wikisource.org/wiki/Common_Sense_(1776)",
    difficultyType: "vocabulary",
    isTranslation: false,
    libraryOrder: 1,
    // No Standard Ebooks edition exists. Wikisource's proofread transcription
    // (built from page-by-page OCR review) preserves real paragraph breaks
    // across page boundaries, unlike Gutenberg's plaintext reflow.
    fetch: {
      type: "wikisource",
      pages: [
        "Common_Sense_(1776)/Introduction",
        "Common_Sense_(1776)/Common_Sense",
        "Common_Sense_(1776)/Appendix",
      ],
    },
  },
  {
    title: "The Declaration of Independence",
    slug: "declaration-of-independence",
    author: "Thomas Jefferson",
    year: "1776",
    sourceUrl: "https://www.archives.gov/founding-docs/declaration-transcript",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 2,
    // No Standard Ebooks edition (they curate literary works, not founding
    // documents). The National Archives' official transcription uses real
    // <p> tags per grievance/paragraph.
    fetch: {
      type: "archives",
      parts: [
        {
          url: "https://www.archives.gov/founding-docs/declaration-transcript",
          startMarker: "In Congress, July 4, 1776",
          endMarker: "Back to Main Declaration Page",
        },
      ],
    },
  },
  {
    title: "Macbeth",
    slug: "macbeth",
    author: "William Shakespeare",
    year: "1606",
    sourceUrl: "https://standardebooks.org/ebooks/william-shakespeare/macbeth",
    difficultyType: "poetic",
    isTranslation: false,
    libraryOrder: 3,
    fetch: {
      type: "standardEbooksDrama",
      repo: "william-shakespeare_macbeth",
      files: ["act-1.xhtml", "act-2.xhtml", "act-3.xhtml", "act-4.xhtml", "act-5.xhtml"],
    },
  },
  {
    title: "Pride and Prejudice",
    slug: "pride-and-prejudice",
    author: "Jane Austen",
    year: "1813",
    sourceUrl: "https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice",
    difficultyType: "vocabulary",
    isTranslation: false,
    libraryOrder: 4,
    fetch: {
      type: "standardEbooksProse",
      repo: "jane-austen_pride-and-prejudice",
      files: chapterFiles(61),
    },
  },
  {
    title: "Jane Eyre",
    slug: "jane-eyre",
    author: "Charlotte Brontë",
    year: "1847",
    sourceUrl: "https://standardebooks.org/ebooks/charlotte-bronte/jane-eyre",
    difficultyType: "vocabulary",
    isTranslation: false,
    libraryOrder: 5,
    // Skip the preface/editorial-note front matter; start at Chapter I.
    fetch: {
      type: "standardEbooksProse",
      repo: "charlotte-bronte_jane-eyre",
      files: chapterFiles(38),
    },
  },
  {
    title: "Walden",
    slug: "walden",
    author: "Henry David Thoreau",
    year: "1854",
    sourceUrl: "https://standardebooks.org/ebooks/henry-david-thoreau/walden",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 6,
    fetch: {
      type: "standardEbooksProse",
      repo: "henry-david-thoreau_walden",
      files: [
        "economy.xhtml",
        "where-i-lived-and-what-i-lived-for.xhtml",
        "reading.xhtml",
        "sounds.xhtml",
        "solitude.xhtml",
        "visitors.xhtml",
        "the-bean-field.xhtml",
        "the-village.xhtml",
        "the-ponds.xhtml",
        "baker-farm.xhtml",
        "higher-laws.xhtml",
        "brute-neighbors.xhtml",
        "house-warming.xhtml",
        "former-inhabitants-and-winter-visitors.xhtml",
        "winter-animals.xhtml",
        "the-pond-in-winter.xhtml",
        "spring.xhtml",
        "conclusion.xhtml",
      ],
    },
  },
  {
    title: "The U.S. Constitution & Bill of Rights",
    slug: "us-constitution",
    author: "United States",
    year: "1787–1791",
    sourceUrl: "https://www.archives.gov/founding-docs/constitution-transcript",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 7,
    // Original 7 articles (excludes later amendments) plus the ratified
    // Bill of Rights, matching v1 scope. Both are official National
    // Archives transcriptions.
    fetch: {
      type: "archives",
      parts: [
        {
          url: "https://www.archives.gov/founding-docs/constitution-transcript",
          startMarker: "We the People",
          endMarker: "For biographies of the non-signing delegates",
        },
        {
          url: "https://www.archives.gov/founding-docs/bill-of-rights-transcript",
          startMarker: "The U.S. Bill of Rights",
          endMarker: "Amendments 11-27",
        },
      ],
    },
  },
  {
    title: "The Communist Manifesto",
    slug: "communist-manifesto",
    author: "Karl Marx & Friedrich Engels",
    year: "1848",
    sourceUrl:
      "https://standardebooks.org/ebooks/karl-marx_friedrich-engels/the-communist-manifesto/samuel-moore",
    difficultyType: "syntax",
    isTranslation: true,
    translationNote: "English translation (Samuel Moore, 1888, authorized by Engels)",
    libraryOrder: 8,
    // Engels' 1888 preface, the manifesto's own unnumbered preamble
    // ("A spectre is haunting Europe..."), then the four numbered chapters.
    fetch: {
      type: "standardEbooksProse",
      repo: "karl-marx_friedrich-engels_the-communist-manifesto_samuel-moore",
      files: [
        "preface.xhtml",
        "introduction.xhtml",
        "chapter-1.xhtml",
        "chapter-2.xhtml",
        "chapter-3.xhtml",
        "chapter-4.xhtml",
      ],
    },
  },
  {
    title: "Self-Reliance",
    slug: "self-reliance",
    author: "Ralph Waldo Emerson",
    year: "1841",
    sourceUrl: "https://standardebooks.org/ebooks/ralph-waldo-emerson/essays",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 9,
    // Standard Ebooks' Emerson "Essays" collection has each essay as its own
    // file, so this is a single-file fetch -- no start/end marker hunting.
    fetch: {
      type: "standardEbooksProse",
      repo: "ralph-waldo-emerson_essays",
      files: ["self-reliance.xhtml"],
    },
  },
  {
    title: "The Metamorphosis",
    slug: "the-metamorphosis",
    author: "Franz Kafka",
    year: "1915",
    sourceUrl: "https://www.gutenberg.org/ebooks/5200",
    difficultyType: "vocabulary",
    isTranslation: true,
    translationNote: "original English translation (David Wyllie)",
    libraryOrder: 10,
    // Standard Ebooks lists this as a planned/unproduced title (placeholder
    // page, no source repo) -- stays on Gutenberg until they publish it.
    fetch: { type: "gutenberg", gutenbergId: 5200 },
  },
  {
    title: "The Crisis, No. 1",
    slug: "the-crisis-no-1",
    author: "Thomas Paine",
    year: "1776",
    sourceUrl: "https://standardebooks.org/ebooks/thomas-paine/the-american-crisis",
    difficultyType: "vocabulary",
    isTranslation: false,
    libraryOrder: 11,
    // Standard Ebooks' "The American Crisis" collects all thirteen numbered
    // papers plus supernumeraries; this is the first paper only ("These are
    // the times that try men's souls").
    fetch: {
      type: "standardEbooksProse",
      repo: "thomas-paine_the-american-crisis",
      files: ["crisis-1.xhtml"],
    },
  },
  {
    title: "Declaration of Sentiments",
    slug: "declaration-of-sentiments",
    author: "Elizabeth Cady Stanton",
    year: "1848",
    sourceUrl: "https://en.wikisource.org/wiki/Declaration_of_Sentiments",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 12,
    // No Standard Ebooks edition (a convention document, not literary work),
    // same as the Declaration of Independence it deliberately mirrors.
    // Wikisource carries a clean proofread transcription.
    fetch: {
      type: "wikisource",
      pages: ["Declaration_of_Sentiments"],
    },
  },
  {
    title: "The Gettysburg Address",
    slug: "gettysburg-address",
    author: "Abraham Lincoln",
    year: "1863",
    sourceUrl: "https://en.wikisource.org/wiki/Gettysburg_Address_(Bliss_copy)",
    difficultyType: "vocabulary",
    isTranslation: false,
    libraryOrder: 13,
    // No Standard Ebooks edition; the manuscript lives at the Library of
    // Congress, not the National Archives. The Bliss copy is the standard
    // reading text -- the version Lincoln himself signed and titled.
    fetch: {
      type: "wikisource",
      pages: ["Gettysburg_Address_(Bliss_copy)"],
    },
  },
  {
    title: "What to the Slave is the Fourth of July?",
    slug: "what-to-the-slave-is-the-fourth-of-july",
    author: "Frederick Douglass",
    year: "1852",
    sourceUrl: "https://en.wikisource.org/wiki/What_to_the_Slave_Is_the_Fourth_of_July",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 14,
    // Speech, not a Standard Ebooks literary work; Wikisource carries the
    // full oration on a single proofread page.
    fetch: {
      type: "wikisource",
      pages: ["What_to_the_Slave_Is_the_Fourth_of_July"],
    },
  },
  {
    title: "A Modest Proposal",
    slug: "a-modest-proposal",
    author: "Jonathan Swift",
    year: "1729",
    sourceUrl: "https://en.wikisource.org/wiki/A_Modest_Proposal",
    difficultyType: "syntax",
    isTranslation: false,
    libraryOrder: 15,
    // Standard Ebooks has no edition of this pamphlet (only Swift's
    // Gulliver's Travels, plus an Essays collection still marked "wanted").
    // Wikisource carries a clean proofread transcription.
    fetch: {
      type: "wikisource",
      pages: ["A_Modest_Proposal"],
    },
  },
];

// ---- shared text-cleanup helpers -------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  shy: "",
  thinsp: " ",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&(\w+);/g, (whole, name) => NAMED_ENTITIES[name] ?? whole);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Strips markup down to plain text. Removes footnote markers (<sup> refs,
// Standard Ebooks noteref links) and Wikisource's running page-number spans
// entirely, since their text content (a bare digit or "[1]") isn't part of
// the prose and would otherwise leak into a paragraph. Inline tags (span,
// i, b, a, etc.) collapse to nothing rather than a space -- decorative
// markup like a drop-cap's first letter often sits flush against the rest
// of the word ("<span>INTRODUCTIO</span>N.") with no source whitespace
// between them, and a blindly inserted space would break the word apart.
// <br> is the one tag that always represents a real word boundary.
function stripTagsToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "")
      .replace(/<a[^>]*epub:type="[^"]*noteref[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "")
      .replace(/<span[^>]*\bpagenum\b[^>]*>[\s\S]*?<\/span>/gi, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  );
}

// Wikisource's Parsoid HTML stores raw wikitext fragments (including literal
// "<span>"/"</span>" substrings) inside data-mw/data-parsoid attribute
// values. A naive tag regex can match a fake "</span>" inside one of those
// attributes and stop early, leaking the rest of the JSON into the output.
// Stripping these attributes first avoids that trap entirely.
function stripMediaWikiAttrs(html: string): string {
  return html
    .replace(/\sdata-mw='[^']*'/g, "")
    .replace(/\sdata-mw="[^"]*"/g, "")
    .replace(/\sdata-parsoid='[^']*'/g, "")
    .replace(/\sdata-parsoid="[^"]*"/g, "");
}

function extractParagraphs(html: string, tagAlternation: string): Paragraph[] {
  const re = new RegExp(`<(${tagAlternation})\\b[^>]*>[\\s\\S]*?<\\/\\1>`, "gi");
  const matches = html.match(re) ?? [];
  return matches
    .map((m) => normalizeWhitespace(stripTagsToText(m)))
    .filter(Boolean)
    .map((text) => ({ text }));
}

function nearestTagStart(html: string, beforeIdx: number): number {
  const candidates = ["<p", "<h2", "<h3"].map((t) => html.lastIndexOf(t, beforeIdx));
  return Math.max(...candidates);
}

// Post-processing safety net: a paragraph boundary that lands mid-sentence
// (e.g. a signature block set on its own line, as happened with Common
// Sense's "...is the / AUTHOR" split) leaves a fragment ending in a bare
// function word -- something a real sentence or list item never ends on.
// Merge it forward into the next paragraph.
const DANGLING_LAST_WORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "at", "for", "with", "by",
  "and", "or", "but", "nor", "from", "into", "onto", "upon",
]);

function lastWord(text: string): string {
  const match = text.match(/([A-Za-z']+)[^A-Za-z']*$/);
  return match ? match[1].toLowerCase() : "";
}

function mergeDanglingFragments(paragraphs: Paragraph[]): Paragraph[] {
  const merged: Paragraph[] = [];
  for (const paragraph of paragraphs) {
    const prev = merged.length > 0 ? merged[merged.length - 1] : undefined;
    if (prev !== undefined && DANGLING_LAST_WORDS.has(lastWord(prev.text))) {
      merged[merged.length - 1] = { ...prev, text: `${prev.text} ${paragraph.text}` };
    } else {
      merged.push(paragraph);
    }
  }
  return merged;
}

// ---- fetchers ---------------------------------------------------------------------

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`fetch failed (${res.status}): ${url}`);
  return await res.text();
}

async function fetchStandardEbooksProse(repo: string, files: string[]): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];
  for (const file of files) {
    const xhtml = await fetchText(
      `https://raw.githubusercontent.com/standardebooks/${repo}/master/src/epub/text/${file}`,
    );
    paragraphs.push(...extractParagraphs(xhtml, "p"));
  }
  return paragraphs;
}

// A row's content cell is a standalone stage direction (not dialogue) when
// its entire content is a single <i epub:type="...stage-direction"> span --
// as opposed to a <p>-wrapped verse cell or plain-text prose line, both of
// which are actual speech.
function isPureStageDirectionCell(cellHtml: string): boolean {
  const inner = cellHtml.replace(/^<td\b[^>]*>/i, "").replace(/<\/td>\s*$/i, "");
  return /^<i\b[^>]*\bstage-direction\b[^>]*>[\s\S]*<\/i>$/i.test(inner.trim());
}

async function fetchStandardEbooksDrama(repo: string, files: string[]): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];
  for (const file of files) {
    const xhtml = await fetchText(
      `https://raw.githubusercontent.com/standardebooks/${repo}/master/src/epub/text/${file}`,
    );
    // Dialogue is laid out as <tr><td persona>SPEAKER</td><td>line</td></tr>;
    // scene-setting text ("A desert place.") appears as plain <p> outside
    // any table. Walk both in document order so sections stay in reading
    // order.
    //
    // When a speech continues after an interleaved stage direction (e.g.
    // Duncan's lines split by "Enter Macbeth, Banquo..."), Standard Ebooks
    // omits the persona cell on the continuation row entirely -- it's
    // implied to be the same speaker as before. So the persona cell isn't
    // reliable per-row; track the last speaker across rows instead, and
    // only withhold attribution for rows that are themselves pure stage
    // direction (which don't represent anyone speaking).
    const blocks = xhtml.match(/<p\b[^>]*>[\s\S]*?<\/p>|<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
    let lastSpeaker: string | undefined;
    for (const block of blocks) {
      if (/^<tr\b/i.test(block)) {
        const cells = block.match(/<td\b[^>]*\/>|<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? [];
        const firstCell = cells[0];
        if (firstCell === undefined) continue;
        const isPersonaFirst = /epub:type="[^"]*persona[^"]*"/i.test(firstCell);
        if (isPersonaFirst) {
          lastSpeaker = normalizeWhitespace(stripTagsToText(firstCell));
        }

        const lineCells = isPersonaFirst ? cells.slice(1) : cells;
        const contentCell = cells[cells.length - 1];
        const isStageDirectionOnly = !isPersonaFirst && isPureStageDirectionCell(contentCell ?? "");

        const line = normalizeWhitespace(stripTagsToText(lineCells.join(" ")));
        if (!line) continue;
        paragraphs.push(
          !isStageDirectionOnly && lastSpeaker ? { text: line, speaker: lastSpeaker } : { text: line },
        );
      } else {
        const text = normalizeWhitespace(stripTagsToText(block));
        if (text) {
          paragraphs.push({ text });
          lastSpeaker = undefined; // scene-setting text marks a fresh scene
        }
      }
    }
  }
  return paragraphs;
}

async function fetchArchivesParagraphs(
  url: string,
  startMarker: string,
  endMarker?: string,
): Promise<Paragraph[]> {
  const html = await fetchText(url);
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`start marker not found in ${url}: "${startMarker}"`);
  const boundStart = nearestTagStart(html, startIdx);
  const endIdx = endMarker ? html.indexOf(endMarker, startIdx) : html.length;
  if (endMarker && endIdx === -1) throw new Error(`end marker not found in ${url}: "${endMarker}"`);
  const slice = html.slice(boundStart === -1 ? startIdx : boundStart, endIdx);
  return extractParagraphs(slice, "p|h2|h3");
}

// Strips a container element and its full contents by tag+class, tracking
// open/close depth so nested same-tag elements (a licenseContainer full of
// nested <div>s, e.g.) don't truncate the match at the first inner close
// tag. Used for Wikisource's page-level chrome -- editorial notice boxes,
// the header/notes block, and the license footer -- which carry their own
// stray <p> tags with no article text in them, so a plain <p> regex can't
// tell them apart from real paragraphs otherwise.
function stripElementByClass(html: string, tag: string, className: string): string {
  const openRe = new RegExp(`<${tag}\\b[^>]*\\bclass="[^"]*\\b${className}\\b[^"]*"[^>]*>`, "i");
  const tagRe = new RegExp(`<${tag}\\b[^>]*>|<\\/${tag}>`, "gi");
  let result = html;
  let open = openRe.exec(result);
  while (open) {
    tagRe.lastIndex = open.index;
    let depth = 0;
    let endIdx = -1;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(result))) {
      depth += m[0].startsWith("</") ? -1 : 1;
      if (depth === 0) {
        endIdx = tagRe.lastIndex;
        break;
      }
    }
    if (endIdx === -1) break; // malformed; bail rather than corrupt the rest
    result = result.slice(0, open.index) + result.slice(endIdx);
    open = openRe.exec(result);
  }
  return result;
}

function stripWikisourceBoilerplate(html: string): string {
  return stripElementByClass(
    stripElementByClass(
      stripElementByClass(stripElementByClass(html, "table", "ambox"), "div", "ws-noexport"),
      "div",
      "licenseContainer",
    ),
    "div",
    "licensetpl",
  );
}

async function fetchWikisourceParagraphs(pages: string[]): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];
  for (const page of pages) {
    const html = await fetchText(
      `https://en.wikisource.org/api/rest_v1/page/html/${encodeURIComponent(page)}`,
    );
    paragraphs.push(...extractParagraphs(stripWikisourceBoilerplate(stripMediaWikiAttrs(html)), "p"));
  }
  return paragraphs;
}

async function fetchGutenbergParagraphs(gutenbergId: number, startAfter?: string): Promise<Paragraph[]> {
  const meta = await fetchText(`https://gutendex.com/books/${gutenbergId}`);
  const book = JSON.parse(meta) as { formats: Record<string, string> };
  const url =
    book.formats["text/plain; charset=utf-8"] ??
    book.formats["text/plain; charset=us-ascii"] ??
    book.formats["text/plain"];
  if (!url) throw new Error(`No plain-text format for Gutenberg id ${gutenbergId}`);
  const raw = await fetchText(url);

  const startMatch = raw.match(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  const endMatch = raw.match(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  const start = startMatch ? startMatch.index! + startMatch[0].length : 0;
  const end = endMatch ? endMatch.index! : raw.length;
  let body = raw.slice(start, end).trim();

  if (startAfter) {
    const idx = body.indexOf(startAfter);
    if (idx === -1) throw new Error(`startAfter marker "${startAfter}" not found`);
    body = body.slice(idx).trim();
  }

  return body
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 0)
    .map((text) => ({ text }));
}

async function resolveParagraphs(fetchStrategy: FetchStrategy): Promise<Paragraph[]> {
  switch (fetchStrategy.type) {
    case "standardEbooksProse":
      return await fetchStandardEbooksProse(fetchStrategy.repo, fetchStrategy.files);
    case "standardEbooksDrama":
      return await fetchStandardEbooksDrama(fetchStrategy.repo, fetchStrategy.files);
    case "archives": {
      const parts = await Promise.all(
        fetchStrategy.parts.map((p) => fetchArchivesParagraphs(p.url, p.startMarker, p.endMarker)),
      );
      return parts.flat();
    }
    case "wikisource":
      return await fetchWikisourceParagraphs(fetchStrategy.pages);
    case "gutenberg":
      return await fetchGutenbergParagraphs(fetchStrategy.gutenbergId, fetchStrategy.startAfter);
  }
}

// ---- import loop --------------------------------------------------------------------

const DRY_RUN = process.argv.includes("--dry-run");
const DUMP_SLUG = process.argv.includes("--dump") ? process.argv[process.argv.indexOf("--dump") + 1] : undefined;
const ONLY_SLUG = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : undefined;

async function importText(config: TextConfig) {
  console.log(`Importing "${config.title}"...`);
  const paragraphs = mergeDanglingFragments(await resolveParagraphs(config.fetch));

  if (DUMP_SLUG === config.slug) {
    paragraphs.forEach((p, i) => console.log(`[${i}]${p.speaker ? ` ${p.speaker}:` : ""} ${p.text}`));
    console.log(`-> ${paragraphs.length} sections`);
    return;
  }

  if (DRY_RUN) {
    console.log(`  -> ${paragraphs.length} sections (dry run, not written)`);
    console.log(`  first: ${paragraphs[0]?.text.slice(0, 150)}`);
    console.log(`  last:  ${paragraphs[paragraphs.length - 1]?.text.slice(0, 150)}`);
    return;
  }

  const textId = await client.mutation(api.texts.create, {
    title: config.title,
    slug: config.slug,
    author: config.author,
    year: config.year,
    sourceUrl: config.sourceUrl,
    difficultyType: config.difficultyType,
    isTranslation: config.isTranslation,
    translationNote: config.translationNote,
    libraryOrder: config.libraryOrder,
  });

  for (let i = 0; i < paragraphs.length; i++) {
    await client.mutation(api.sections.create, {
      textId,
      order: i,
      original: paragraphs[i].text,
      speaker: paragraphs[i].speaker,
    });
  }

  console.log(`  -> ${paragraphs.length} sections`);
}

async function main() {
  for (const config of TEXTS) {
    if (DUMP_SLUG && DUMP_SLUG !== config.slug) continue;
    if (ONLY_SLUG && ONLY_SLUG !== config.slug) continue;
    try {
      await importText(config);
    } catch (err) {
      console.error(`FAILED "${config.title}":`, err);
    }
  }
}

main();
