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

  if (text === undefined) return <main className="p-8">Loading…</main>;
  if (text === null) return <main className="p-8">Text not found.</main>;

  const draftCount = sections?.filter((s) => s.status === "draft").length ?? 0;

  const handleApproveAll = async () => {
    if (draftCount === 0) return;
    if (!confirm(`Approve all ${draftCount} drafted section${draftCount === 1 ? "" : "s"}?`)) {
      return;
    }
    await approveAll({ textId: text._id });
  };

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-sm text-neutral-500">
            {text.author}, {text.year} — {sections?.length ?? 0} section
            {sections?.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/read/${text.slug}`}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
          >
            View reader
          </Link>
          <button
            onClick={handleApproveAll}
            disabled={draftCount === 0}
            className="rounded bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Approve All ({draftCount})
          </button>
        </div>
      </div>
      {sections?.map((section) => (
        <SectionReviewRow key={section._id} section={section} />
      ))}
    </main>
  );
}
