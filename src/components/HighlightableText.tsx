"use client";

import { ReactNode, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";

// Character offset of (node, offset) relative to the start of container's
// text content -- works regardless of how many child spans sit in between,
// by measuring the string length of a range from the container's start.
function offsetWithinContainer(container: Node, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, offset);
  return range.toString().length;
}

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
  const highlights = useQuery(api.highlights.listForSection, { sectionId, side });
  const createHighlight = useMutation(api.highlights.create);
  const setNote = useMutation(api.highlights.setNote);
  const removeHighlight = useMutation(api.highlights.remove);

  const containerRef = useRef<HTMLSpanElement>(null);
  const [activeHighlight, setActiveHighlight] = useState<Doc<"highlights"> | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [signInHint, setSignInHint] = useState(false);

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

    void createHighlight({ sectionId, side, startOffset: start, endOffset: end, text: text.slice(start, end) });
  };

  const openNoteEditor = (highlight: Doc<"highlights">) => {
    setActiveHighlight(highlight);
    setNoteDraft(highlight.note ?? "");
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

  const pieces: ReactNode[] = [];
  const sorted = [...(highlights ?? [])].sort((a, b) => a.startOffset - b.startOffset);
  let cursor = 0;
  for (const h of sorted) {
    if (h.startOffset < cursor) continue; // skip overlapping highlight, first one wins
    if (h.startOffset > cursor) pieces.push(text.slice(cursor, h.startOffset));
    pieces.push(
      <mark
        key={h._id}
        onClick={() => openNoteEditor(h)}
        className={`cursor-pointer rounded-sm bg-accent/30 ${h.note ? "underline decoration-accent decoration-2" : ""}`}
        title={h.note || "Click to annotate"}
      >
        {text.slice(h.startOffset, h.endOffset)}
      </mark>,
    );
    cursor = h.endOffset;
  }
  if (cursor < text.length) pieces.push(text.slice(cursor));

  return (
    <div className={className}>
      <p onMouseUp={handleMouseUp}>
        {speaker && <strong>{speaker}: </strong>}
        <span ref={containerRef}>{pieces}</span>
      </p>
      {signInHint && (
        <p className="mt-1 text-xs text-muted-foreground">Sign in to highlight and annotate.</p>
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
            <button
              onClick={() => setActiveHighlight(null)}
              className="ml-auto text-xs text-muted-foreground hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
