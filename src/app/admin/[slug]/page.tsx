"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SectionReviewRow } from "@/components/admin/SectionReviewRow";

export default function AdminTextPage() {
  const params = useParams<{ slug: string }>();
  const text = useQuery(api.texts.getBySlug, { slug: params.slug });
  const sections = useQuery(
    api.sections.listAllByText,
    text ? { textId: text._id } : "skip",
  );

  if (text === undefined) return <main className="p-8">Loading…</main>;
  if (text === null) return <main className="p-8">Text not found.</main>;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">{text.title}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {text.author}, {text.year} — {sections?.length ?? 0} section
        {sections?.length === 1 ? "" : "s"}
      </p>
      {sections?.map((section) => (
        <SectionReviewRow key={section._id} section={section} />
      ))}
    </main>
  );
}
