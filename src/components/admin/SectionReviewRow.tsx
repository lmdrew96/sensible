"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Markdown, withSpeaker } from "@/components/Markdown";

const STATUS_STYLES: Record<Doc<"sections">["status"], string> = {
  approved: "bg-green-100 text-green-800",
  draft: "bg-amber-100 text-amber-800",
  pending: "bg-muted text-muted-foreground",
};

const AUTOSAVE_DELAY_MS = 800;

const GLOSS_STATUS_STYLES: Record<Doc<"glosses">["status"], string> = {
  approved: "bg-green-100 text-green-800",
  suggested: "bg-amber-100 text-amber-800",
};

export function SectionReviewRow({ section }: { section: Doc<"sections"> }) {
  const [draft, setDraft] = useState(section.modernized ?? "");
  const [generating, setGenerating] = useState(false);
  const [glossing, setGlossing] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const generateDraft = useAction(api.modernize.generateDraft);
  const saveDraft = useMutation(api.sections.saveDraft);
  const approve = useMutation(api.sections.approve);
  const remove = useMutation(api.sections.remove);

  const glossesResult = useQuery(api.glosses.listForSection, { sectionId: section._id }) ?? [];
  // Highest-demand suggestions first, so reader-requested terms with several
  // asks surface above one-off AI-swept guesses.
  const glosses = [...glossesResult].sort((a, b) => (b.requestCount ?? 0) - (a.requestCount ?? 0));
  const generateGlossSuggestions = useAction(api.glossify.generateSuggestions);
  const approveGloss = useMutation(api.glosses.approve);
  const removeGloss = useMutation(api.glosses.remove);

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

  const handleSuggestGlosses = async () => {
    setGlossing(true);
    try {
      await generateGlossSuggestions({ sectionId: section._id });
    } finally {
      setGlossing(false);
    }
  };

  return (
    <div className="panel mb-4 p-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Section {section.order + 1}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[section.status]}`}
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
            className="h-full min-h-32 w-full rounded-md border border-border bg-background p-2 text-base outline-none focus:border-accent sm:text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="No draft yet — click Generate Draft"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={handleGenerate} disabled={generating} className="btn-primary py-1.5 text-sm">
          {generating ? "Generating…" : draft ? "Regenerate Draft" : "Generate Draft"}
        </button>
        <button
          onClick={handleApprove}
          className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white shadow-sm"
        >
          Approve
        </button>
        <button
          onClick={handleSuggestGlosses}
          disabled={glossing || !draft}
          className="btn-ghost py-1.5 text-sm disabled:opacity-50"
        >
          {glossing ? "Suggesting…" : glosses.length ? "Re-suggest Glosses" : "Suggest Glosses"}
        </button>
        <button
          onClick={handleDelete}
          className="ml-auto rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>

      {glosses.length > 0 && (
        <ul className="mt-3 space-y-2">
          {glosses.map((gloss) => (
            <li
              key={gloss._id}
              className="flex items-start justify-between gap-3 rounded-md border border-border bg-background/40 p-2 text-sm"
            >
              <div>
                <span
                  className={`mr-2 rounded-full px-1.5 py-0.5 text-xs font-medium ${GLOSS_STATUS_STYLES[gloss.status]}`}
                >
                  {gloss.status}
                </span>
                {gloss.source === "reader_request" && (
                  <span className="mr-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                    from a reader{gloss.requestCount && gloss.requestCount > 1 ? ` — asked ${gloss.requestCount}×` : ""}
                  </span>
                )}
                <span className="font-medium">{gloss.term}</span>
                <span className="text-muted-foreground"> — {gloss.explanation}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                {gloss.status === "suggested" && (
                  <button
                    onClick={() => approveGloss({ glossId: gloss._id })}
                    className="rounded-md bg-green-700 px-2 py-1 text-xs text-white"
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => removeGloss({ glossId: gloss._id })}
                  className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  {gloss.status === "approved" ? "Remove" : "Reject"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
