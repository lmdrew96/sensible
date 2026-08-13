import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sections", { ...args, status: "pending" });
  },
});

export const saveDraft = mutation({
  args: {
    sectionId: v.id("sections"),
    modernized: v.string(),
    gloss: v.optional(v.string()),
  },
  handler: async (ctx, { sectionId, modernized, gloss }) => {
    await ctx.db.patch(sectionId, { modernized, gloss, status: "draft" });
  },
});

export const approve = mutation({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    await ctx.db.patch(sectionId, { status: "approved", approvedAt: Date.now() });
  },
});
