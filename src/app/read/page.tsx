"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";

type SortOption = "default" | "title" | "author" | "year";
type DifficultyType = Doc<"texts">["difficultyType"];

const DIFFICULTY_LABELS: Record<DifficultyType, string> = {
  vocabulary: "Vocabulary",
  syntax: "Syntax",
  poetic: "Poetic",
};

const SORTERS: Record<SortOption, (a: Doc<"texts">, b: Doc<"texts">) => number> = {
  default: (a, b) => a.libraryOrder - b.libraryOrder,
  title: (a, b) => a.title.localeCompare(b.title),
  author: (a, b) => a.author.localeCompare(b.author),
  year: (a, b) => parseInt(a.year, 10) - parseInt(b.year, 10),
};

export default function LibraryPage() {
  const texts = useQuery(api.texts.listPublished);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("default");
  const [difficultyFilter, setDifficultyFilter] = useState<Set<DifficultyType>>(new Set());

  const toggleDifficulty = (type: DifficultyType) => {
    setDifficultyFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const visibleTexts = useMemo(() => {
    if (!texts) return texts;
    const query = search.trim().toLowerCase();
    return texts
      .filter((text) => {
        if (difficultyFilter.size > 0 && !difficultyFilter.has(text.difficultyType)) return false;
        if (!query) return true;
        return (
          text.title.toLowerCase().includes(query) || text.author.toLowerCase().includes(query)
        );
      })
      .sort(SORTERS[sort]);
  }, [texts, search, sort, difficultyFilter]);

  return (
    <main className="mx-auto max-w-3xl p-8 min-w-3/4">
      <header className="mb-8">
        <h1 className="font-header text-3xl font-semibold">The Library</h1>
        <p className="mt-1 text-muted-foreground">
          Old writings, put in common language so they make sense.
        </p>
      </header>

      {texts === undefined && <p className="text-muted-foreground">Loading…</p>}

      {texts?.length === 0 && (
        <p className="text-muted-foreground">
          The library isn&apos;t public yet — texts are still being reviewed. Check back soon.
        </p>
      )}

      {texts && texts.length > 0 && (
        <>
          <div className="mb-6 space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or author…"
                className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="rounded border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="default">Library order</option>
                <option value="title">Title (A–Z)</option>
                <option value="author">Author (A–Z)</option>
                <option value="year">Year (oldest first)</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIFFICULTY_LABELS) as DifficultyType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleDifficulty(type)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    difficultyFilter.has(type)
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/50"
                  }`}
                >
                  {DIFFICULTY_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {visibleTexts?.length === 0 && (
            <p className="text-muted-foreground">No texts match your search.</p>
          )}

          <div className="grid grid-cols-2 gap-6">
            {visibleTexts?.map((text) => (
              <Link
                key={text._id}
                href={`/read/${text.slug}`}
                className="block rounded border border-border p-4 hover:border-foreground/50"
              >
                <h2 className="font-medium">{text.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {text.author}, {text.year}
                </p>
                {text.isTranslation && text.translationNote && (
                  <p className="mt-1 text-xs text-muted-foreground italic">
                    {text.translationNote}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
