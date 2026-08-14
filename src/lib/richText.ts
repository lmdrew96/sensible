export type FormatType = "bold" | "italic" | "heading";

export interface FormatRange {
  start: number;
  end: number;
  type: FormatType;
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
// and a leading #/##/### heading line -- into plain text plus format
// ranges over that plain text. Offsets are computed here deterministically
// rather than asked of the model, which is unreliable at precise character
// counting. Anything else (links, lists, tables, code) is left as literal
// text -- this is not a general markdown parser.
export function parseDelimited(source: string): { plain: string; ranges: FormatRange[] } {
  const headingMatch = source.match(/^(#{1,3})\s+/);
  const isHeading = headingMatch !== null;
  const body = isHeading ? source.slice(headingMatch![0].length) : source;

  const ranges: FormatRange[] = [];
  let plain = "";
  let i = 0;
  while (i < body.length) {
    if (body.startsWith("**", i)) {
      const end = findClosing(body, i + 2, "**");
      if (end !== -1) {
        const start = plain.length;
        plain += body.slice(i + 2, end);
        ranges.push({ start, end: plain.length, type: "bold" });
        i = end + 2;
        continue;
      }
    }
    if (body[i] === "*") {
      const end = findClosing(body, i + 1, "*");
      if (end !== -1) {
        const start = plain.length;
        plain += body.slice(i + 1, end);
        ranges.push({ start, end: plain.length, type: "italic" });
        i = end + 1;
        continue;
      }
    }
    plain += body[i];
    i++;
  }

  if (isHeading) {
    ranges.unshift({ start: 0, end: plain.length, type: "heading" });
  }

  ranges.sort((a, b) => a.start - b.start);
  return { plain, ranges };
}
