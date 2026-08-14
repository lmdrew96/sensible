import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("texts")
      .withIndex("by_libraryOrder")
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("texts").withIndex("by_libraryOrder").collect();
  },
});

export const get = query({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }) => {
    return await ctx.db.get(textId);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("texts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    author: v.string(),
    year: v.string(),
    sourceUrl: v.string(),
    difficultyType: v.union(
      v.literal("vocabulary"),
      v.literal("syntax"),
      v.literal("poetic"),
    ),
    isTranslation: v.boolean(),
    translationNote: v.optional(v.string()),
    libraryOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("texts", { ...args, status: "draft" });
  },
});

export const publish = mutation({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }) => {
    await ctx.db.patch(textId, { status: "published" });
  },
});

export const startGlossSweep = mutation({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }) => {
    await ctx.db.patch(textId, { glossSweepActive: true });
    await ctx.scheduler.runAfter(0, internal.glossify.sweepText, { textId });
  },
});

export const cancelGlossSweep = mutation({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }) => {
    await ctx.db.patch(textId, { glossSweepActive: false });
  },
});

// Called only from glossify.sweepText once it runs out of unchecked
// sections, so the sweep button resets on its own without a manual cancel.
export const finishGlossSweep = internalMutation({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }) => {
    await ctx.db.patch(textId, { glossSweepActive: false });
  },
});

export const remove = mutation({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }) => {
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_text", (q) => q.eq("textId", textId))
      .collect();
    for (const section of sections) {
      await ctx.db.delete(section._id);
    }
    await ctx.db.delete(textId);
  },
});
