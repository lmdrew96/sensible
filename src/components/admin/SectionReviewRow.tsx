"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";

const STATUS_STYLES: Record<Doc<"sections">["status"], string> = {
  approved: "bg-green-100 text-green-800",
  draft: "bg-amber-100 text-amber-800",
  pending: "bg-neutral-100 text-neutral-600",
};

export function SectionReviewRow({ section }: { section: Doc<"sections"> }) {
  const [draft, setDraft] = useState(section.modernized ?? "");
  const [generating, setGenerating] = useState(false);
  const generateDraft = useAction(api.modernize.generateDraft);
  const saveDraft = useMutation(api.sections.saveDraft);
  const approve = useMutation(api.sections.approve);
  const remove = useMutation(api.sections.remove);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const modernized = await generateDraft({ sectionId: section._id });
      setDraft(modernized);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    await saveDraft({ sectionId: section._id, modernized: draft });
  };

  const handleApprove = async () => {
    if (draft !== section.modernized) {
      await saveDraft({ sectionId: section._id, modernized: draft });
    }
    await approve({ sectionId: section._id });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this section? This can't be undone.")) return;
    await remove({ sectionId: section._id });
  };

  return (
    <div className="border-b border-neutral-200 py-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
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
          <p className="mb-1 text-xs text-neutral-500">Original</p>
          <p className="text-sm whitespace-pre-wrap">{section.original}</p>
        </div>
        <div>
          <p className="mb-1 text-xs text-neutral-500">Modernized</p>
          <textarea
            className="h-full min-h-32 w-full rounded border border-neutral-300 p-2 text-sm"
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
          className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {generating ? "Generating…" : draft ? "Regenerate Draft" : "Generate Draft"}
        </button>
        <button
          onClick={handleSave}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          Save
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
