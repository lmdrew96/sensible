export type FormatType = "bold" | "italic" | "heading";

export interface FormatRange {
  start: number;
  end: number;
  type: FormatType;
  level?: 1 | 2 | 3; // only set for type: "heading"
}

const BLANK_LINE = /\n[ \t]*\n/;

// Finds the next occurrence of `marker`, but -- matching CommonMark's own
// rule that emphasis can't cross a paragraph break -- refuses to close a
// span if a blank line falls between the opener and it. Without this, an
// unclosed marker earlier in the text could pair with an unrelated marker
// paragraphs later and swallow everything in between.
function findClosing(body: string, from: number, marker: string): number {
  const end = body.indexOf(marker, from);
  if (end === -1) return -1;
  if (BLANK_LINE.test(body.slice(from, end))) return -1;
  return end;
}

// Parses a small, LLM-reliable subset of markdown -- **bold**, *italic*,
// and #/##/### heading lines -- into plain text plus format ranges over
// that plain text. Offsets are computed here deterministically rather than
// asked of the model, which is unreliable at precise character counting.
// Anything else (links, lists, tables, code) is left as literal text --
// this is not a general markdown parser.
export function parseDelimited(source: string): { plain: string; ranges: FormatRange[] } {
  const ranges: FormatRange[] = [];
  let plain = "";
  let i = 0;
  let atLineStart = true;
  // A heading (ATX-style, like real markdown) runs from its marker to the
  // end of that line only -- never past the newline, and never swallowing
  // a paragraph that follows after a blank line.
  let openHeading: { start: number; level: 1 | 2 | 3 } | null = null;

  while (i < source.length) {
    if (atLineStart) {
      const headingMatch = /^(#{1,3})[ \t]+/.exec(source.slice(i));
      if (headingMatch) {
        openHeading = { start: plain.length, level: headingMatch[1].length as 1 | 2 | 3 };
        i += headingMatch[0].length;
      }
      atLineStart = false;
      continue;
    }

    if (source[i] === "\n") {
      if (openHeading) {
        ranges.push({ start: openHeading.start, end: plain.length, type: "heading", level: openHeading.level });
        openHeading = null;
      }
      plain += "\n";
      i++;
      atLineStart = true;
      continue;
    }

    if (source.startsWith("**", i)) {
      const end = findClosing(source, i + 2, "**");
      if (end !== -1) {
        const start = plain.length;
        plain += source.slice(i + 2, end);
        ranges.push({ start, end: plain.length, type: "bold" });
        i = end + 2;
        continue;
      }
    }
    if (source[i] === "*") {
      const end = findClosing(source, i + 1, "*");
      if (end !== -1) {
        const start = plain.length;
        plain += source.slice(i + 1, end);
        ranges.push({ start, end: plain.length, type: "italic" });
        i = end + 1;
        continue;
      }
    }

    plain += source[i];
    i++;
  }

  if (openHeading) {
    ranges.push({ start: openHeading.start, end: plain.length, type: "heading", level: openHeading.level });
  }

  ranges.sort((a, b) => a.start - b.start);
  return { plain, ranges };
}
