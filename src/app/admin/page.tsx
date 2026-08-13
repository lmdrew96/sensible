"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export default function AdminPage() {
  const texts = useQuery(api.texts.listAll);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Admin — Review Texts</h1>
      {texts === undefined && <p className="text-neutral-500">Loading…</p>}
      {texts?.length === 0 && (
        <p className="text-neutral-500">No texts yet.</p>
      )}
      <ul className="divide-y divide-neutral-200">
        {texts?.map((text) => (
          <li key={text._id} className="flex items-center justify-between py-3">
            <div>
              <Link href={`/admin/${text.slug}`} className="font-medium hover:underline">
                {text.title}
              </Link>
              <p className="text-sm text-neutral-500">{text.author}</p>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                text.status === "published"
                  ? "bg-green-100 text-green-800"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {text.status}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
