"use node";

import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const anthropic = new Anthropic();

const DIFFICULTY_GUIDANCE: Record<string, string> = {
  vocabulary:
    "The difficulty here is archaic vocabulary and idiom — words that have changed meaning or fallen out of use since this was written. Focus on replacing these with their modern equivalents.",
  syntax:
    "The difficulty here is long, nested, or inverted sentence structure. Focus on breaking these into clear modern sentence order without losing any clause's meaning.",
  poetic:
    "The difficulty here is rhythmic, dense, or allusive language. Focus on clarifying meaning while preserving the sense that the original was crafted, not plain.",
};

export const generateDraft = action({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }): Promise<string> => {
    const section = await ctx.runQuery(api.sections.get, { sectionId });
    if (!section) throw new Error("Section not found");
    const text = await ctx.runQuery(api.texts.get, { textId: section.textId });
    if (!text) throw new Error("Text not found");

    const system = `You modernize archaic English prose into plain contemporary English for the app Sensible. The modernization must preserve the original's exact meaning, tone, sentiment, register, and rhetorical intent — you are simplifying vocabulary and syntax, not softening or flattening the writer's voice. Urgency stays urgent; irony stays ironic.

${DIFFICULTY_GUIDANCE[text.difficultyType]}

This passage is from "${text.title}" by ${text.author} (${text.year}). Output only the modernized passage, with no preamble and no markdown formatting.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: section.original }],
    });

    const block = response.content.find((b) => b.type === "text");
    const modernized = block && block.type === "text" ? block.text.trim() : "";

    await ctx.runMutation(api.sections.saveDraft, { sectionId, modernized });

    return modernized;
  },
});
