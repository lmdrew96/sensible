import Link from "next/link";
import { THEMES } from "@/lib/theme";

// Declaration of Independence, 1776 -- public domain. Chosen as the demo
// snippet because it's widely recognized, so the before/after reads as a
// meaning-preserving rephrase rather than a mystery passage.
const DEMO_ORIGINAL =
  "We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.";
const DEMO_MODERNIZED =
  "We hold these truths to be self-evident: that all men are created equal; that their Creator gives them certain rights that cannot be taken away; that these rights include life, liberty, and the pursuit of happiness.";

const FEATURES = [
  {
    title: "Themes",
    description: "Three color palettes, each with a light and dark mode.",
  },
  {
    title: "Reader fonts",
    description: "Serif, sans, mono, or dyslexia-friendly — pick what's easiest to read.",
  },
  {
    title: "Highlight & annotate",
    description: "Mark up passages and leave yourself notes as you read.",
  },
  {
    title: "Reader glosses",
    description: "Stuck on a word or phrase? Ask what it means without leaving the page.",
  },
] as const;

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-header text-6xl font-semibold text-accent">Sensible</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Old writings, put in common language so they make sense.
        </p>
        <Link href="/read" className="btn-primary mt-6">
          Browse the Library
        </Link>
      </div>

      <div className="fleuron-divider mt-14 w-full max-w-3xl">
        <span>❦</span>
      </div>

      <div className="panel w-full max-w-3xl p-6">
        <div className="hidden gap-x-8 pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid sm:grid-cols-2">
          <span>Original — 1776</span>
          <span>Modernized</span>
        </div>
        <div className="hairline grid grid-cols-1 gap-y-4 pb-5 text-sm sm:grid-cols-2 sm:gap-x-8 sm:gap-y-0">
          <p className="leaf-original">
            <span className="mb-1 block text-xs font-medium tracking-wide text-muted-foreground uppercase sm:hidden">
              Original — 1776
            </span>
            {DEMO_ORIGINAL}
          </p>
          <p className="leaf-modern">
            <span className="mb-1 block text-xs font-medium tracking-wide text-muted-foreground uppercase sm:hidden">
              Modernized
            </span>
            {DEMO_MODERNIZED}
          </p>
        </div>
      </div>

      <div className="mt-14 grid w-full max-w-3xl grid-cols-2 gap-5 sm:grid-cols-4">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="panel panel-interactive p-4 text-left">
            <h2 className="font-medium">{feature.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
            {feature.title === "Themes" && (
              <div className="mt-3 flex gap-2">
                {THEMES.map((theme) => (
                  <span
                    key={theme.value}
                    title={theme.label}
                    className="h-5 w-5 rounded-full border border-border"
                    style={{ backgroundColor: theme.swatch }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
