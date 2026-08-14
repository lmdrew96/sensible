"use client";

import { useReaderFont } from "@/components/useReaderFont";
import { READER_FONTS } from "@/lib/reader-font";
import { useTheme } from "@/components/useTheme";
import { THEMES } from "@/lib/theme";

export default function SettingsPage() {
  const { font, setFont } = useReaderFont();
  const { theme, setTheme } = useTheme();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="font-header text-3xl font-semibold">Settings</h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Theme
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a color palette. Use the sun/moon toggle in the nav bar to switch light and
          dark.
        </p>

        <div className="mt-4 flex gap-3">
          {THEMES.map((option) => (
            <label
              key={option.value}
              className={`flex flex-1 cursor-pointer flex-col items-center gap-2 rounded border p-3 ${
                theme === option.value
                  ? "border-foreground"
                  : "border-border hover:border-foreground/50"
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={theme === option.value}
                onChange={() => setTheme(option.value)}
                className="sr-only"
              />
              <span
                className="h-8 w-8 rounded-full border border-border"
                style={{ backgroundColor: option.swatch }}
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Reader font
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the font used for text in the reader.
        </p>

        <div className="mt-4 space-y-2">
          {READER_FONTS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center justify-between rounded border p-3 ${
                font === option.value
                  ? "border-foreground"
                  : "border-border hover:border-foreground/50"
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
                <span className="text-xs text-muted-foreground">{option.sample}</span>
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
