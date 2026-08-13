import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
