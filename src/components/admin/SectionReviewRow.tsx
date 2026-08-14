"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Markdown, withSpeaker } from "@/components/Markdown";

const STATUS_STYLES: Record<Doc<"sections">["status"], string> = {
  approved: "bg-green-100 text-green-800",
  draft: "bg-amber-100 text-amber-800",
  pending: "bg-muted text-muted-foreground",
};

const AUTOSAVE_DELAY_MS = 800;

export function SectionReviewRow({ section }: { section: Doc<"sections"> }) {
  const [draft, setDraft] = useState(section.modernized ?? "");
  const [generating, setGenerating] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const generateDraft = useAction(api.modernize.generateDraft);
  const saveDraft = useMutation(api.sections.saveDraft);
  const approve = useMutation(api.sections.approve);
  const remove = useMutation(api.sections.remove);

  // Autosave: debounce edits so every keystroke doesn't fire a mutation, but
  // typing without ever clicking a button still persists and flips the
  // status badge to "draft" automatically.
  const lastSaved = useRef(section.modernized ?? "");
  useEffect(() => {
    if (draft === lastSaved.current) return;
    setSaveState("saving");
    const timer = setTimeout(async () => {
      await saveDraft({ sectionId: section._id, modernized: draft });
      lastSaved.current = draft;
      setSaveState("saved");
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, saveDraft, section._id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const modernized = await generateDraft({ sectionId: section._id });
      lastSaved.current = modernized;
      setDraft(modernized);
      setSaveState("saved");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (draft !== lastSaved.current) {
      await saveDraft({ sectionId: section._id, modernized: draft });
      lastSaved.current = draft;
    }
    await approve({ sectionId: section._id });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this section? This can't be undone.")) return;
    await remove({ sectionId: section._id });
  };

  return (
    <div className="border-b border-border py-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Section {section.order + 1}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[section.status]}`}
        >
          {section.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Original</p>
          <Markdown className="prose-sm">{withSpeaker(section.original, section.speaker)}</Markdown>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Modernized{section.speaker ? ` — ${section.speaker}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
            </p>
          </div>
          <textarea
            className="h-full min-h-32 w-full rounded border border-border p-2 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="No draft yet — click Generate Draft"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded bg-accent px-3 py-1.5 text-sm text-accent-foreground disabled:opacity-50"
        >
          {generating ? "Generating…" : draft ? "Regenerate Draft" : "Generate Draft"}
        </button>
        <button
          onClick={handleApprove}
          className="rounded bg-green-700 px-3 py-1.5 text-sm text-white"
        >
          Approve
        </button>
        <button
          onClick={handleDelete}
          className="ml-auto rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
