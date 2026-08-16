"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SectionReviewRow } from "@/components/admin/SectionReviewRow";

export default function AdminTextPage() {
  const params = useParams<{ slug: string }>();
  const text = useQuery(api.texts.getBySlug, { slug: params.slug });
  const sections = useQuery(
    api.sections.listAllByText,
    text ? { textId: text._id } : "skip",
  );
  const approveAll = useMutation(api.sections.approveAll);
  const publish = useMutation(api.texts.publish);
  const startGlossSweep = useMutation(api.texts.startGlossSweep);
  const cancelGlossSweep = useMutation(api.texts.cancelGlossSweep);

  if (text === undefined) return <main className="p-8">Loading…</main>;
  if (text === null) return <main className="p-8">Text not found.</main>;

  const draftCount = sections?.filter((s) => s.status === "draft").length ?? 0;
  const unapprovedCount = sections?.filter((s) => s.status !== "approved").length ?? 0;
  const approvedSections = sections?.filter((s) => s.status === "approved") ?? [];
  const glossCheckedCount = approvedSections.filter((s) => s.glossCheckedAt).length;

  const handleApproveAll = async () => {
    if (draftCount === 0) return;
    if (!confirm(`Approve all ${draftCount} drafted section${draftCount === 1 ? "" : "s"}?`)) {
      return;
    }
    await approveAll({ textId: text._id });
  };

  const handlePublish = async () => {
    if (!confirm(`Publish "${text.title}"? It will appear in the public library.`)) {
      return;
    }
    await publish({ textId: text._id });
  };

  const handleSweepGlosses = async () => {
    if (text.glossSweepActive) {
      await cancelGlossSweep({ textId: text._id });
    } else {
      await startGlossSweep({ textId: text._id });
    }
  };

  return (
    <main className="mx-auto max-w-5xl p-8 min-w-3/4">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-header text-2xl font-semibold text-accent">{text.title}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                text.status === "published"
                  ? "bg-green-100 text-green-800"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {text.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {text.author}, {text.year} — {sections?.length ?? 0} section
            {sections?.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/read/${text.slug}`} className="btn-ghost py-1.5 text-sm">
            View reader
          </Link>
          <button
            onClick={handleApproveAll}
            disabled={draftCount === 0}
            className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white shadow-sm disabled:opacity-40"
          >
            Approve All ({draftCount})
          </button>
          <button
            onClick={handleSweepGlosses}
            disabled={
              !text.glossSweepActive &&
              (approvedSections.length === 0 || glossCheckedCount === approvedSections.length)
            }
            title={
              text.glossSweepActive
                ? "Stop the sweep after its current batch finishes"
                : "Scans every approved section that hasn't been checked yet and suggests glosses for the ones that need them"
            }
            className={`rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 ${
              text.glossSweepActive
                ? "border-amber-400 bg-amber-100 text-amber-800"
                : "border-border"
            }`}
          >
            {text.glossSweepActive ? "Cancel Sweep" : "Sweep for Glosses"} ({glossCheckedCount}/
            {approvedSections.length})
          </button>
          <button
            onClick={handlePublish}
            disabled={text.status === "published" || unapprovedCount > 0}
            title={
              unapprovedCount > 0
                ? `${unapprovedCount} section${unapprovedCount === 1 ? "" : "s"} not yet approved`
                : undefined
            }
            className="btn-primary py-1.5 text-sm disabled:opacity-40"
          >
            {text.status === "published" ? "Published" : "Publish"}
          </button>
        </div>
      </div>
      {sections?.map((section) => (
        <SectionReviewRow key={section._id} section={section} />
      ))}
    </main>
  );
}
