"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { HighlightableText } from "@/components/HighlightableText";
import { useReadingPosition } from "@/components/useReadingPosition";
import { parseDelimited } from "@/lib/richText";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToSection(el: HTMLElement) {
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

// Threshold below which the back-to-top button appears -- roughly past the
// header, resume banner, and Contents panel, so it shows up once "top"
// actually means scrolling back rather than just being a step away.
const BACK_TO_TOP_THRESHOLD = 600;

export default function ReaderPage() {
  const params = useParams<{ slug: string }>();
  // Keyed by slug so switching texts resets scroll-position tracking,
  // resume state, and the observed-section map instead of carrying the
  // previous text's state over.
  return <ReaderPageInner key={params.slug} slug={params.slug} />;
}

function ReaderPageInner({ slug }: { slug: string }) {
  const [singleSide, setSingleSide] = useState(false);

  const text = useQuery(api.texts.getBySlug, { slug });
  const sections = useQuery(
    api.sections.listApprovedByText,
    text ? { textId: text._id } : "skip",
  );

  // Sections whose entire modernized text is a "# " heading are chapter/
  // act/article breaks the import pipeline split out on their own (see
  // scripts/import.ts's h2|h3 extraction) -- the natural landmarks for a
  // table of contents, with no schema changes needed.
  const landmarks = useMemo(() => {
    if (!sections) return [];
    const result: { id: string; order: number; label: string }[] = [];
    for (const section of sections) {
      if (!section.modernized) continue;
      const { plain, ranges } = parseDelimited(section.modernized);
      const label = plain.trim();
      if (!label) continue;
      const isWholeHeading = ranges.some(
        (r) => r.type === "heading" && r.start === 0 && r.end === plain.length,
      );
      if (isWholeHeading) result.push({ id: section._id, order: section.order, label });
    }
    return result;
  }, [sections]);

  const sectionEls = useRef(new Map<string, HTMLDivElement>());
  const handleSectionRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const id = el.dataset.sectionId;
    if (id) sectionEls.current.set(id, el);
  }, []);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const { savedSectionId, recordPosition, loaded } = useReadingPosition(slug);
  const [resumeTarget, setResumeTarget] = useState<string | null>(null);
  const hasCheckedResume = useRef(false);

  // Offer to resume rather than silently auto-scrolling -- a surprise jump
  // on load is disorienting if the reader opened the text to start over.
  useEffect(() => {
    if (hasCheckedResume.current || !loaded || !sections || sections.length === 0) return;
    hasCheckedResume.current = true;
    if (
      savedSectionId &&
      savedSectionId !== sections[0]._id &&
      sections.some((s) => s._id === savedSectionId)
    ) {
      setResumeTarget(savedSectionId);
    }
  }, [loaded, sections, savedSectionId]);

  useEffect(() => {
    if (!sections || sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = (visible[0].target as HTMLElement).dataset.sectionId;
        if (id) {
          setActiveSectionId(id);
          recordPosition(id);
        }
      },
      // A thin trigger band near the top of the viewport, rather than the
      // whole viewport, so "current section" tracks what the reader is
      // actually looking at instead of whatever merely scrolled into view.
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 },
    );
    for (const el of sectionEls.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [sections, recordPosition]);

  const currentLandmark = useMemo(() => {
    if (!activeSectionId || !sections) return null;
    const active = sections.find((s) => s._id === activeSectionId);
    if (!active) return null;
    let current: { id: string; label: string } | null = null;
    for (const l of landmarks) {
      if (l.order <= active.order) current = l;
      else break;
    }
    return current;
  }, [activeSectionId, sections, landmarks]);

  const jumpToSection = (id: string) => {
    const el = sectionEls.current.get(id);
    if (el) scrollToSection(el);
  };

  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > BACK_TO_TOP_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

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

      {resumeTarget && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-muted/40 p-3 text-sm">
          <span>You were partway through this text.</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                jumpToSection(resumeTarget);
                setResumeTarget(null);
              }}
              className="rounded bg-accent px-3 py-1 text-xs text-accent-foreground"
            >
              Jump back in
            </button>
            <button
              onClick={() => setResumeTarget(null)}
              className="text-xs text-muted-foreground hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {landmarks.length > 1 && (
        <details className="mb-6 rounded border border-border p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Contents{currentLandmark ? ` — currently in ${currentLandmark.label}` : ""}
          </summary>
          <nav className="mt-3 flex flex-col gap-1">
            {landmarks.map((l) => (
              <a
                key={l.id}
                href={`#section-${l.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  jumpToSection(l.id);
                }}
                className={`rounded px-2 py-1 hover:bg-muted ${
                  l.id === currentLandmark?.id ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </details>
      )}

      {sections === undefined && <p className="text-muted-foreground">Loading…</p>}
      {sections?.length === 0 && (
        <p className="text-muted-foreground">
          No approved sections yet — this text isn&apos;t ready for readers.
        </p>
      )}

      {!singleSide && (
        <div className="hidden gap-x-8 border-b border-border pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid sm:grid-cols-2">
          <span>Original</span>
          <span>Modernized</span>
        </div>
      )}

      <div className="reader-text">
        {sections?.map((section) => (
          <div
            key={section._id}
            id={`section-${section._id}`}
            data-section-id={section._id}
            ref={handleSectionRef}
          >
            {singleSide ? (
              <HighlightableText
                sectionId={section._id}
                side="modernized"
                text={section.modernized ?? ""}
                speaker={section.speaker}
                className="border-b border-border py-4"
              />
            ) : (
              <div className="grid grid-cols-1 gap-y-4 border-b border-border py-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-0">
                <div>
                  <span className="mb-1 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase sm:hidden">
                    Original
                  </span>
                  <HighlightableText
                    sectionId={section._id}
                    side="original"
                    text={section.original}
                    speaker={section.speaker}
                  />
                </div>
                <div>
                  <span className="mb-1 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase sm:hidden">
                    Modernized
                  </span>
                  <HighlightableText
                    sectionId={section._id}
                    side="modernized"
                    text={section.modernized ?? ""}
                    speaker={section.speaker}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top of text"
          className="fixed right-4 bottom-4 z-20 rounded border border-border bg-background px-3 py-2 text-sm shadow-sm hover:border-foreground/50 sm:right-6 sm:bottom-6"
        >
          ↑ Top
        </button>
      )}
    </main>
  );
}
