"use client";

import { useReaderFont } from "@/components/useReaderFont";
import { READER_FONTS } from "@/lib/reader-font";

export default function SettingsPage() {
  const { font, setFont } = useReaderFont();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="font-header text-3xl font-semibold">Settings</h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
          Reader font
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Choose the font used for text in the reader.
        </p>

        <div className="mt-4 space-y-2">
          {READER_FONTS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center justify-between rounded border p-3 ${
                font === option.value
                  ? "border-neutral-800"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <div className="flex w-40 shrink-0 items-center gap-2">
                <input
                  type="radio"
                  name="reader-font"
                  value={option.value}
                  checked={font === option.value}
                  onChange={() => setFont(option.value)}
                />
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-neutral-400">{option.sample}</span>
              </div>
              <span
                data-reader-font={option.value}
                className="text-sm"
                style={{ fontFamily: `var(--font-reader-${option.value})` }}
              >
                The quick brown fox
              </span>
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}
