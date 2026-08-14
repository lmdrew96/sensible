"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Markdown, withSpeaker } from "@/components/Markdown";

export default function ReaderPage() {
  const params = useParams<{ slug: string }>();
  const [singleSide, setSingleSide] = useState(false);

  const text = useQuery(api.texts.getBySlug, { slug: params.slug });
  const sections = useQuery(
    api.sections.listApprovedByText,
    text ? { textId: text._id } : "skip",
  );

  if (text === undefined) return <main className="p-8">Loading…</main>;
  if (text === null) return <main className="p-8">Text not found.</main>;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="font-header text-3xl font-semibold">{text.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {text.author}, {text.year}
        </p>
        {text.isTranslation && text.translationNote && (
          <p className="mt-1 text-sm text-muted-foreground italic">{text.translationNote}</p>
        )}
        <button
          onClick={() => setSingleSide((v) => !v)}
          className="mt-4 rounded border border-border px-3 py-1.5 text-sm"
        >
          {singleSide ? "Show original side by side" : "Modernized only"}
        </button>
      </header>

      {sections === undefined && <p className="text-muted-foreground">Loading…</p>}
      {sections?.length === 0 && (
        <p className="text-muted-foreground">
          No approved sections yet — this text isn&apos;t ready for readers.
        </p>
      )}

      {!singleSide && (
        <div className="grid grid-cols-2 gap-x-8 border-b border-border pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <span>Original</span>
          <span>Modernized</span>
        </div>
      )}

      <div className="reader-text">
        {sections?.map((section) =>
          singleSide ? (
            <Markdown key={section._id} className="border-b border-border py-4">
              {withSpeaker(section.modernized ?? "", section.speaker)}
            </Markdown>
          ) : (
            <div
              key={section._id}
              className="grid grid-cols-2 gap-x-8 border-b border-border py-4"
            >
              <Markdown>{withSpeaker(section.original, section.speaker)}</Markdown>
              <Markdown>{withSpeaker(section.modernized ?? "", section.speaker)}</Markdown>
            </div>
          ),
        )}
      </div>
    </main>
  );
}
