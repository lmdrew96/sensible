import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Safety net against agent-authored preamble ("Here's the modernized
// version:") leaking into stored content -- this must never reach readers.
const PREAMBLE_PATTERN =
  /^(?:sure[,!]?\s*)?(?:here(?:'s| is)|this is)\s+(?:the\s+)?modernized[^\n]*:\s*\n+/i;

function stripPreamble(text: string): string {
  return text.replace(PREAMBLE_PATTERN, "").trim();
}

export const get = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    return await ctx.db.get(sectionId);
  },
});

export const listApprovedByText = query({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }) => {
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_text", (q) => q.eq("textId", textId))
      .collect();
    return sections
      .filter((s) => s.status === "approved")
      .sort((a, b) => a.order - b.order);
  },
});

export const listPrecedingContext = query({
  args: { textId: v.id("texts"), order: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, { textId, order, limit }) => {
    const preceding = await ctx.db
      .query("sections")
      .withIndex("by_text", (q) => q.eq("textId", textId).lt("order", order))
      .order("desc")
      .take(limit ?? 4);
    return preceding.reverse();
  },
});

export const listAllByText = query({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }) => {
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_text", (q) => q.eq("textId", textId))
      .collect();
    return sections.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: {
    textId: v.id("texts"),
    order: v.number(),
    original: v.string(),
    speaker: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sections", { ...args, status: "pending" });
  },
});

export const saveDraft = mutation({
  args: {
    sectionId: v.id("sections"),
    modernized: v.string(),
  },
  handler: async (ctx, { sectionId, modernized }) => {
    await ctx.db.patch(sectionId, {
      modernized: stripPreamble(modernized),
      status: "draft",
    });
  },
});

export const approve = mutation({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    await ctx.db.patch(sectionId, { status: "approved", approvedAt: Date.now() });
  },
});

export const approveAll = mutation({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }) => {
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_text", (q) => q.eq("textId", textId))
      .collect();
    const now = Date.now();
    let count = 0;
    for (const s of sections) {
      if (s.status === "draft") {
        await ctx.db.patch(s._id, { status: "approved", approvedAt: now });
        count++;
      }
    }
    return count;
  },
});

export const remove = mutation({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    await ctx.db.delete(sectionId);
  },
});
