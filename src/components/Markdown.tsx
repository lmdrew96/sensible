"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Shared renderer for any AI-generated or source-scraped text surface.
// react-markdown never executes raw HTML by default, so this is safe against
// stray markup the model produces despite being told not to -- it renders
// as intended instead of leaking literal asterisks/pound signs.
//
// Wrapped in `prose` (@tailwindcss/typography): Tailwind's preflight reset
// strips default browser styling from every element markdown can produce --
// not just lists, but headings, blockquotes, code, tables, hr, all of it --
// so each one renders as unstyled plain text despite the correct tag being
// there. Patching elements back one at a time as gaps get noticed doesn't
// converge; `prose` covers the full CommonMark/GFM surface at once.
// `max-w-none` drops its opinionated 65ch cap -- our layout already
// controls width via the surrounding grid/flex containers.
//
// Always wrapped in a single element regardless: react-markdown renders
// multiple block children (e.g. a paragraph followed by a list, or two
// paragraphs from a blank line) as unwrapped siblings. Placed directly
// inside a CSS grid -- as the reader's side-by-side view does -- each of
// those siblings becomes its own grid item and gets auto-placed away from
// the content it belongs with, instead of staying attached to it. The
// wrapper keeps everything one grid cell regardless of how many blocks the
// markdown produces.
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`prose prose-neutral dark:prose-invert max-w-none ${className ?? ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

// Deterministically prefixes a play's speaker onto a line of dialogue as
// bold markdown, so attribution is always correct and consistently
// formatted -- never left to the model to preserve or reformat.
export function withSpeaker(text: string, speaker?: string): string {
  return speaker ? `**${speaker}:** ${text}` : text;
}
