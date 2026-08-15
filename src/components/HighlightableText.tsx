"use client";

import { Fragment, ReactNode, useMemo, useRef, useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { parseDelimited, type FormatRange } from "@/lib/richText";

// Character offset of (node, offset) relative to the start of container's
// text content -- works regardless of how many child spans sit in between,
// by measuring the string length of a range from the container's start.
function offsetWithinContainer(container: Node, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, offset);
  return range.toString().length;
}

type Highlight = Doc<"highlights">;
type Gloss = Doc<"glosses">;
type GlossRange = { start: number; end: number; gloss: Gloss };

// Approved glosses are stored as a verbatim term, not offsets -- find every
// non-overlapping occurrence of each term in the plain text at render time.
// This is more forgiving than stored offsets if the modernized text is
// edited after the gloss was approved, and needs no coordination with
// src/lib/richText.ts's offset math.
function findGlossRanges(plain: string, glosses: Gloss[]): GlossRange[] {
  const ranges: GlossRange[] = [];
  for (const gloss of glosses) {
    let from = 0;
    while (from <= plain.length) {
      const idx = plain.indexOf(gloss.term, from);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + gloss.term.length, gloss });
      from = idx + gloss.term.length;
    }
  }
  return ranges;
}

// Merges format ranges (bold/italic/heading, from the modernization),
// highlight ranges (per-reader, from the highlights table), and gloss
// ranges (admin-approved, from the glosses table) into a flat,
// non-overlapping list of styled segments -- the same technique a rich
// text editor uses to render style runs over plain text.
function buildSegments(
  length: number,
  formatRanges: FormatRange[],
  highlights: Highlight[],
  glossRanges: GlossRange[],
) {
  const points = new Set<number>([0, length]);
  for (const r of formatRanges) {
    points.add(r.start);
    points.add(r.end);
  }
  for (const h of highlights) {
    points.add(h.startOffset);
    points.add(h.endOffset);
  }
  for (const g of glossRanges) {
    points.add(g.start);
    points.add(g.end);
  }
  const sorted = [...points].sort((a, b) => a - b);

  const segments: {
    start: number;
    end: number;
    bold: boolean;
    italic: boolean;
    headingLevel: 1 | 2 | 3 | undefined;
    highlight: Highlight | undefined;
    gloss: Gloss | undefined;
  }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start >= end) continue;
    segments.push({
      start,
      end,
      bold: formatRanges.some((r) => r.type === "bold" && r.start <= start && r.end >= end),
      italic: formatRanges.some((r) => r.type === "italic" && r.start <= start && r.end >= end),
      headingLevel: formatRanges.find((r) => r.type === "heading" && r.start <= start && r.end >= end)
        ?.level,
      highlight: highlights.find((h) => h.startOffset <= start && h.endOffset >= end),
      gloss: glossRanges.find((g) => g.start <= start && g.end >= end)?.gloss,
    });
  }
  return segments;
}

const HEADING_SIZE: Record<1 | 2 | 3, string> = {
  1: "text-2xl font-bold",
  2: "text-xl font-semibold",
  3: "text-lg font-semibold",
};

export function HighlightableText({
  sectionId,
  side,
  text,
  speaker,
  className,
}: {
  sectionId: Id<"sections">;
  side: "original" | "modernized";
  text: string;
  speaker?: string;
  className?: string;
}) {
  const { isAuthenticated } = useConvexAuth();
  const highlightsResult = useQuery(api.highlights.listForSection, { sectionId, side });
  const highlights = useMemo(() => highlightsResult ?? [], [highlightsResult]);
  const createHighlight = useMutation(api.highlights.create);
  const setNote = useMutation(api.highlights.setNote);
  const removeHighlight = useMutation(api.highlights.remove);
  const requestGloss = useAction(api.glossify.requestGloss);

  // Glosses are authored against the modernized text -- the original side
  // never shows them.
  const glossesResult = useQuery(
    api.glosses.listApprovedForSection,
    side === "modernized" ? { sectionId } : "skip",
  );
  const glosses = useMemo(() => glossesResult ?? [], [glossesResult]);
  const [activeGloss, setActiveGloss] = useState<Gloss | null>(null);

  // Original text is verbatim historical source -- never reinterpret stray
  // asterisks/pound signs as formatting. Only the LLM-authored modernized
  // side uses the bold/italic/heading subset.
  const { plain, ranges } = useMemo(
    () => (side === "modernized" ? parseDelimited(text) : { plain: text, ranges: [] }),
    [text, side],
  );

  const containerRef = useRef<HTMLSpanElement>(null);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [signInHint, setSignInHint] = useState(false);
  const [requestedGloss, setRequestedGloss] = useState<{ term: string; explanation: string } | null>(null);
  const [glossRequestState, setGlossRequestState] = useState<"idle" | "loading" | "error">("idle");

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;
    if (
      !containerRef.current.contains(selection.anchorNode) ||
      !containerRef.current.contains(selection.focusNode)
    ) {
      return;
    }

    if (!isAuthenticated) {
      selection.removeAllRanges();
      setSignInHint(true);
      setTimeout(() => setSignInHint(false), 2500);
      return;
    }

    const a = offsetWithinContainer(containerRef.current, selection.anchorNode!, selection.anchorOffset);
    const b = offsetWithinContainer(containerRef.current, selection.focusNode!, selection.focusOffset);
    const [start, end] = a < b ? [a, b] : [b, a];
    selection.removeAllRanges();
    if (end <= start) return;

    void createHighlight({ sectionId, side, startOffset: start, endOffset: end, text: plain.slice(start, end) });
  };

  const openNoteEditor = (highlight: Highlight) => {
    setActiveHighlight(highlight);
    setNoteDraft(highlight.note ?? "");
    setRequestedGloss(null);
    setGlossRequestState("idle");
  };

  const handleSaveNote = async () => {
    if (!activeHighlight) return;
    await setNote({ highlightId: activeHighlight._id, note: noteDraft.trim() || undefined });
    setActiveHighlight(null);
  };

  const handleDelete = async () => {
    if (!activeHighlight) return;
    await removeHighlight({ highlightId: activeHighlight._id });
    setActiveHighlight(null);
  };

  const handleWhatDoesThisMean = async () => {
    if (!activeHighlight) return;
    setGlossRequestState("loading");
    setRequestedGloss(null);
    try {
      const result = await requestGloss({ sectionId, term: activeHighlight.text });
      setRequestedGloss(result);
      setGlossRequestState("idle");
    } catch {
      setGlossRequestState("error");
    }
  };

  const glossRanges = useMemo(() => findGlossRanges(plain, glosses), [plain, glosses]);
  const segments = buildSegments(plain.length, ranges, highlights, glossRanges);
  const rendered: ReactNode = segments.map((seg) => {
    let node: ReactNode = plain.slice(seg.start, seg.end);
    if (seg.bold) node = <strong>{node}</strong>;
    if (seg.italic) node = <em>{node}</em>;
    if (seg.headingLevel) node = <span className={HEADING_SIZE[seg.headingLevel]}>{node}</span>;
    if (seg.gloss) {
      const g = seg.gloss;
      node = (
        <button
          type="button"
          onClick={() => setActiveGloss((current) => (current?._id === g._id ? null : g))}
          className="cursor-help underline decoration-dotted decoration-muted-foreground underline-offset-4"
        >
          {node}
        </button>
      );
    }
    if (seg.highlight) {
      const h = seg.highlight;
      node = (
        <mark
          onClick={() => openNoteEditor(h)}
          className={`cursor-pointer rounded-sm bg-accent/30 ${h.note ? "underline decoration-accent decoration-2" : ""}`}
          title={h.note || "Click to annotate"}
        >
          {node}
        </mark>
      );
    }
    return <Fragment key={`${seg.start}-${seg.end}`}>{node}</Fragment>;
  });

  return (
    <div className={className}>
      <p onMouseUp={handleMouseUp} className="whitespace-pre-line">
        {speaker && <strong>{speaker}: </strong>}
        <span ref={containerRef}>{rendered}</span>
      </p>
      {signInHint && (
        <p className="mt-1 text-xs text-muted-foreground">Sign in to highlight and annotate.</p>
      )}
      {activeGloss && (
        <div className="mt-2 rounded border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{activeGloss.term}</p>
          <p className="mt-1 text-muted-foreground">{activeGloss.explanation}</p>
          <button
            onClick={() => setActiveGloss(null)}
            className="mt-2 text-xs text-muted-foreground hover:underline"
          >
            Close
          </button>
        </div>
      )}
      {activeHighlight && (
        <div className="mt-2 rounded border border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs text-muted-foreground italic">
            &ldquo;{activeHighlight.text}&rdquo;
          </p>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a note…"
            className="w-full rounded border border-border bg-background p-2 text-sm"
            rows={2}
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleSaveNote}
              className="rounded bg-accent px-3 py-1 text-xs text-accent-foreground"
            >
              Save
            </button>
            <button
              onClick={handleDelete}
              className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
            >
              Remove highlight
            </button>
            {side === "modernized" && (
              <button
                onClick={handleWhatDoesThisMean}
                disabled={glossRequestState === "loading"}
                className="rounded border border-border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
              >
                {glossRequestState === "loading" ? "Asking…" : "What does this mean?"}
              </button>
            )}
            <button
              onClick={() => setActiveHighlight(null)}
              className="ml-auto text-xs text-muted-foreground hover:underline"
            >
              Close
            </button>
          </div>
          {glossRequestState === "error" && (
            <p className="mt-2 text-xs text-red-700">Couldn&apos;t get an explanation -- try again.</p>
          )}
          {requestedGloss && (
            <div className="mt-2 rounded border border-border bg-background p-2 text-sm">
              <p className="font-medium">{requestedGloss.term}</p>
              <p className="mt-1 text-muted-foreground">{requestedGloss.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
