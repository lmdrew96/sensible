"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export default function LibraryPage() {
  const texts = useQuery(api.texts.listPublished);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <header className="mb-8">
        <h1 className="font-header text-3xl font-semibold">The Library</h1>
        <p className="mt-1 text-neutral-500">
          Old writings, put in common language so they make sense.
        </p>
      </header>

      {texts === undefined && <p className="text-neutral-500">Loading…</p>}

      {texts?.length === 0 && (
        <p className="text-neutral-500">
          The library isn&apos;t public yet — texts are still being reviewed. Check back soon.
        </p>
      )}

      {texts && texts.length > 0 && (
        <div className="grid grid-cols-2 gap-6">
          {texts.map((text) => (
            <Link
              key={text._id}
              href={`/read/${text.slug}`}
              className="block rounded border border-neutral-200 p-4 hover:border-neutral-400"
            >
              <h2 className="font-medium">{text.title}</h2>
              <p className="text-sm text-neutral-500">
                {text.author}, {text.year}
              </p>
              {text.isTranslation && text.translationNote && (
                <p className="mt-1 text-xs text-neutral-400 italic">{text.translationNote}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
