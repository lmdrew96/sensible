"use node";

import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { action, internalAction, ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const anthropic = new Anthropic();

const MAX_SUGGESTIONS = 5;
// Sections processed per sweep step before rescheduling -- keeps each
// action invocation well under Convex's execution time limit regardless of
// how many sections a text has.
const SWEEP_BATCH_SIZE = 5;

// Rough plain-text view of the modernized markdown subset (**bold**,
// *italic*, "# " headings -- see src/lib/richText.ts) used only to sanity
// check that a suggested term is a real substring of the passage, not a
// paraphrase. Doesn't need to match parseDelimited byte-for-byte -- it's a
// safety filter, not the renderer.
function stripFormatting(source: string): string {
  return source
    .split("\n")
    .map((line) => line.replace(/^#{1,3}[ \t]+/, ""))
    .join("\n")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "");
}

// A passage that's nothing but a section/article citation ("Section 4.",
// "Article V.", "Amendment XIV") has no content to explain. Haiku glossed
// these anyway despite an explicit prompt instruction not to, so this is a
// deterministic guard rather than a suggestion -- skips the LLM call
// entirely instead of hoping the model declines every time.
const BARE_CITATION_LABEL = /^(?:article|section|chapter|amendment|clause)\s+[ivxlcdm\d]+\.?$/i;

const GLOSS_SCHEMA = {
  type: "object",
  properties: {
    glosses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["term", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["glosses"],
  additionalProperties: false,
} as const;

async function suggestGlossesForSection(ctx: ActionCtx, sectionId: Id<"sections">): Promise<void> {
  const section = await ctx.runQuery(api.sections.get, { sectionId });
  if (!section) throw new Error("Section not found");
  if (!section.modernized) throw new Error("Section has no modernized draft yet");

  const plain = stripFormatting(section.modernized);
  if (BARE_CITATION_LABEL.test(plain.trim())) {
    await ctx.runMutation(internal.glosses.replaceSuggestions, { sectionId, suggestions: [] });
    return;
  }

  const text = await ctx.runQuery(api.texts.get, { textId: section.textId });
  if (!text) throw new Error("Text not found");

  const system = `You help readers of "${text.title}" by ${text.author} (${text.year}) on the app Sensible. Sensible already modernizes archaic prose into plain English, but some words or phrases survive modernization on purpose -- proper nouns, historical or legal references, allusions, idioms, or terms with no good modern equivalent -- and can still leave a modern reader unsure what's meant.

Given one already-modernized passage, find only the specific words or short phrases within it that a modern reader would likely still find unclear or want defined. Most passages need zero glosses -- only flag a term if a reader would genuinely have to stop and look it up. Return at most ${MAX_SUGGESTIONS} glosses; if the passage doesn't need any, return an empty list, and don't force one just to have something to return.

Never gloss:
- A section/article/chapter/amendment citation, like "Section 3.", "Article V.", or "Amendment XIV" -- even when discussing what that section covers, the citation label itself is never something to define. Example: given the passage "Section 4. This section covers the timing of congressional elections.", gloss nothing -- not even "Section 4." -- because a citation number isn't content.
- Ordinary, everyday words or phrases, no matter how old or short the passage is.
- Speaker names.
- Anything the modernization already explained in plain words elsewhere in the same passage.

Only gloss something with real, specific content a reader could look up: an unfamiliar proper noun, a historical or legal or technical term, an allusion, or an idiom whose meaning isn't obvious from context.

For each gloss:
- "term" must be an exact, verbatim substring copied from the passage below -- same spelling, capitalization, and punctuation, with no surrounding markdown asterisks or "#" marks. Never paraphrase or invent a term that isn't literally present in the passage.
- "explanation" is a short, plain-English explanation (one or two sentences) a reader can glance at without leaving the page.`;

  const message = await anthropic.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    // Haiku 4.5 rejects output_config.effort outright (400: "This model does
    // not support the effort parameter") -- only the format is passed here.
    output_config: {
      format: { type: "json_schema", schema: GLOSS_SCHEMA },
    },
    messages: [{ role: "user", content: `Passage:\n\n${section.modernized}` }],
  });

  const parsed = message.parsed_output as { glosses: { term: string; explanation: string }[] } | null;
  const raw = parsed?.glosses ?? [];

  const seen = new Set<string>();
  const suggestions: { term: string; explanation: string }[] = [];
  for (const g of raw) {
    const term = g.term.trim();
    const explanation = g.explanation.trim();
    if (!term || !explanation) continue;
    if (!plain.includes(term)) continue;
    if (seen.has(term)) continue;
    seen.add(term);
    suggestions.push({ term, explanation });
    if (suggestions.length >= MAX_SUGGESTIONS) break;
  }

  await ctx.runMutation(internal.glosses.replaceSuggestions, { sectionId, suggestions });
}

export const generateSuggestions = action({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }): Promise<void> => {
    await suggestGlossesForSection(ctx, sectionId);
  },
});

// Sweeps every approved section in a text that hasn't been gloss-checked
// yet, a handful at a time, rescheduling itself until the whole text has
// been checked. A section that errors (e.g. a transient API failure) is
// skipped, not retried -- it stays unchecked and a future sweep will pick
// it back up.
//
// Cancellation is cooperative via texts.glossSweepActive rather than
// scheduler.cancel(): cancelGlossSweep just flips that flag, and this
// action checks it both before starting a batch (in case it was cancelled
// while queued) and after finishing one (in case it was cancelled mid-run)
// before deciding whether to reschedule. That's simpler than racing
// scheduler.cancel() against an already-executing invocation, at the cost
// of finishing the in-flight batch (up to SWEEP_BATCH_SIZE sections)
// before actually stopping.
export const sweepText = internalAction({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }): Promise<void> => {
    const text = await ctx.runQuery(api.texts.get, { textId });
    if (!text?.glossSweepActive) return;

    const sections = await ctx.runQuery(api.sections.listApprovedByText, { textId });
    const pending = sections.filter((s) => !s.glossCheckedAt);
    const batch = pending.slice(0, SWEEP_BATCH_SIZE);

    for (const section of batch) {
      try {
        await suggestGlossesForSection(ctx, section._id);
      } catch (err) {
        // suggestGlossesForSection only stamps glossCheckedAt on success, so
        // a section that throws (e.g. a transient API error) would
        // otherwise stay "pending" forever and get retried every single
        // sweep cycle, stalling the whole text. Mark it checked with no
        // suggestions instead -- a manual "Suggest Glosses" click can still
        // retry it individually later.
        console.error(`Gloss sweep failed for section ${section._id}:`, err);
        await ctx.runMutation(internal.glosses.replaceSuggestions, {
          sectionId: section._id,
          suggestions: [],
        });
      }
    }

    const stillPending = pending.length > batch.length;
    const stillActive = stillPending && (await ctx.runQuery(api.texts.get, { textId }))?.glossSweepActive;

    if (stillActive) {
      await ctx.scheduler.runAfter(0, internal.glossify.sweepText, { textId });
    } else {
      await ctx.runMutation(internal.texts.finishGlossSweep, { textId });
    }
  },
});
