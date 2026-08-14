"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export default function AdminPage() {
  const texts = useQuery(api.texts.listAll);
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/admin-logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-header text-2xl font-semibold">Admin — Review Texts</h1>
        <button
          onClick={handleSignOut}
          className="rounded border border-border px-3 py-1.5 text-sm"
        >
          Sign out
        </button>
      </div>
      {texts === undefined && <p className="text-muted-foreground">Loading…</p>}
      {texts?.length === 0 && (
        <p className="text-muted-foreground">No texts yet.</p>
      )}
      <ul className="divide-y divide-border">
        {texts?.map((text) => (
          <li key={text._id} className="flex items-center justify-between py-3">
            <div>
              <Link href={`/admin/${text.slug}`} className="font-medium hover:underline">
                {text.title}
              </Link>
              <p className="text-sm text-muted-foreground">{text.author}</p>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                text.status === "published"
                  ? "bg-green-100 text-green-800"
                  : "bg-muted text-muted-foreground"
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
