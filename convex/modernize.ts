"use node";

import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const anthropic = new Anthropic();

// Safety net: catches the rare case where the model asks for clarification or
// refuses instead of modernizing, so bad content fails loudly instead of saving.
const REFUSAL_PATTERN =
  /\b(could you (please )?paste|wasn'?t included|i need the actual (passage|text)|i'?m not able to help|i can'?t (help|assist)|please (provide|paste|share) the (passage|text|excerpt)|it looks like (you'?ve given me only|the passage))\b/i;

const DIFFICULTY_GUIDANCE: Record<string, string> = {
  vocabulary:
    "The difficulty here is archaic vocabulary and idiom — words that have changed meaning or fallen out of use since this was written. Focus on replacing these with their modern equivalents.",
  syntax:
    "The difficulty here is long, nested, or inverted sentence structure. Focus on breaking these into clear modern sentence order without losing any clause's meaning.",
  poetic:
    "The difficulty here is rhythmic, dense, or allusive language, often also strung into long, tangled clause-chains packed with colons and semicolons. Clarity of meaning always outranks keeping the original's sentence boundaries or punctuation — where the original crams multiple ideas into one dense sentence, break it into shorter, clearly ordered modern sentences. A passage that still reads as a wall of text after modernizing has failed its job. At the same time, preserve the sense that the original was crafted — its imagery, rhythm, and word choice — not plain. If the original lines rhyme, try to preserve that rhyme scheme in the modernized version too — but never force a rhyme at the cost of meaning; if a rhyme can't be kept without distorting the sense, drop it and stay faithful to the meaning instead.",
};

export const generateDraft = action({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }): Promise<string> => {
    const section = await ctx.runQuery(api.sections.get, { sectionId });
    if (!section) throw new Error("Section not found");
    const text = await ctx.runQuery(api.texts.get, { textId: section.textId });
    if (!text) throw new Error("Text not found");
    const precedingContext = await ctx.runQuery(api.sections.listPrecedingContext, {
      textId: section.textId,
      order: section.order,
    });

    const system = `You modernize archaic English prose into plain contemporary English for the app Sensible. The modernization must preserve the original's exact meaning, tone, sentiment, register, and rhetorical intent — you are simplifying vocabulary and syntax, not softening or flattening the writer's voice. Urgency stays urgent; irony stays ironic.

${DIFFICULTY_GUIDANCE[text.difficultyType]}

This passage is from "${text.title}" by ${text.author} (${text.year}). Output only the modernized passage, with no preamble and no commentary.

You may use exactly three formatting marks, only where the original's own emphasis or structure calls for them: **double asterisks** for words the original stresses, *single asterisks* for a lighter emphasis or a foreign/title phrase, and a leading "# " on a passage that is itself a standalone heading or label (e.g. a chapter title, not a full sentence). Use these sparingly and only to carry over emphasis or structure that is actually present in the original — never to add emphasis of your own. Do not use any other markdown: no links, lists, tables, code, or nested/multiple headings.

Any stage direction (a bracketed or unbracketed staging cue like [Exit, pursued by a bear], Enter Hamlet, or a sound/setting cue like Thunder or A cavern) must be output as parenthetical italics: wrap it in parentheses and single asterisks, e.g. *(Exit, pursued by a bear)*. This applies whether or not the original set it off with brackets, parentheses, or italics of its own. If the entire passage is stage direction, wrap the whole thing in one pair of parentheses and asterisks — never split it into a wrapped part and an unwrapped part, and never leave a stage-direction-only passage unwrapped.

The passage given to you is the complete, intentional unit to modernize — even when it's just a single word, a name, a short exclamation, or a brief stage direction. Modernize only that text. Never continue past it: no inventing dialogue, no adding characters, no extending into a scene that wasn't given. If the passage is already in modern English, output it unchanged rather than commenting on it.

Never ask for clarification, request the passage, or claim it's missing, incomplete, or too short to work with — the text given to you is the complete passage, no matter how short it is, how it begins, or how it ends. This includes: a passage that's only a heading or label with no body text (modernize the heading itself — don't ask for the section it introduces), a passage that's a fragment or the opening of a longer letter or quotation (modernize just that fragment — don't ask for the rest), and a passage from a well-known copyrighted work (modernizing a licensed excerpt for this app is exactly your task — never decline on copyright or reproduction grounds). If you're ever about to write something like "Could you provide..." or "I need the passage..." — stop. The text given to you above is the entire passage. Modernize it as given.

Preserve quotation marks exactly as meaning requires. If the passage is itself a quoted line of dialogue, a quoted epigraph, or a quoted maxim — wrapped in the original's own opening and closing quotation marks — keep both marks in your output; never strip them just because they span the whole passage. If the passage is one paragraph of a longer multi-paragraph quotation (e.g. one paragraph of a quoted letter), preserve whichever of the opening/closing marks that specific passage's own text actually contains — don't invent a mark that isn't there, and don't drop one that is.

You may be shown a few lines that come immediately before this passage, each labeled with its speaker (when known) and its own already-modernized text. That context exists only so you can resolve pronouns, names, and references correctly, and — in dialogue — understand what's actually being responded to (e.g. a one-word reply, a collective exclamation, an aside that only makes sense against the line before it). Never modernize, repeat, quote, or continue the context — it is not part of your task. Critically, the speaker labels in that context are metadata for your reading only: never start your own output with a speaker name or label, even if the passage you're modernizing has a known speaker. Output only the modernized text itself, exactly as if no speaker label existed.

Use that context for meaning only, never as a grammatical crutch — and never reuse the original's grammar (verb tense, auxiliary verb, sentence pattern) just because the archaic passage did. A short reply in dialogue must be grammatically correct against the *modernized* wording of what it's replying to, not the archaic wording. If the modernized question uses "is" ("Is the king leaving today?"), a short answer must echo "is" ("He is" — never "He does", even though the archaic question used a construction that "does" would have answered). Work out what a modern English speaker would actually say back to the modernized question shown in the context, not a word-for-word swap of the original reply's grammar. The result must also be a complete sentence on its own — not a fragment that only parses if the reader mentally re-supplies a missing word (e.g. never end on a dangling "to" with nothing after it).`;

    const contextBlock = precedingContext.length
      ? precedingContext
          .map((s) => {
            const speakerLabel = s.speaker ? `[spoken by ${s.speaker}]` : "[speaker unknown]";
            const modernizedLine = s.modernized
              ? `Modernized: ${s.modernized}`
              : "Modernized: (not yet drafted)";
            return `${speakerLabel}\nOriginal: ${s.original}\n${modernizedLine}`;
          })
          .join("\n\n")
      : null;

    const speakerNote = section.speaker ? ` [spoken by ${section.speaker}]` : "";
    const userContent = contextBlock
      ? `Preceding context, for reference only — do not output any part of this:\n\n${contextBlock}\n\n---\n\nNow modernize only this passage${speakerNote} (remember: do not prefix your output with the speaker name):\n\n${section.original}`
      : section.original;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8192,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "medium" },
      messages: [{ role: "user", content: userContent }],
    });

    const block = response.content.find((b) => b.type === "text");
    const modernized = block && block.type === "text" ? block.text.trim() : "";

    if (REFUSAL_PATTERN.test(modernized)) {
      throw new Error(
        `Model declined or asked for clarification instead of modernizing: ${modernized.slice(0, 200)}`,
      );
    }

    await ctx.runMutation(api.sections.saveDraft, { sectionId, modernized });

    return modernized;
  },
});
