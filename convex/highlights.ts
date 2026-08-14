import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const side = v.union(v.literal("original"), v.literal("modernized"));

export const listForSection = query({
  args: { sectionId: v.id("sections"), side },
  handler: async (ctx, { sectionId, side }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("highlights")
      .withIndex("by_section_and_side_and_user", (q) =>
        q.eq("sectionId", sectionId).eq("side", side).eq("userId", userId),
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    sectionId: v.id("sections"),
    side,
    startOffset: v.number(),
    endOffset: v.number(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to highlight");
    if (args.endOffset <= args.startOffset) throw new Error("Invalid highlight range");
    return await ctx.db.insert("highlights", { ...args, userId });
  },
});

export const setNote = mutation({
  args: { highlightId: v.id("highlights"), note: v.optional(v.string()) },
  handler: async (ctx, { highlightId, note }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");
    const highlight = await ctx.db.get(highlightId);
    if (!highlight || highlight.userId !== userId) throw new Error("Highlight not found");
    await ctx.db.patch(highlightId, { note });
  },
});

export const remove = mutation({
  args: { highlightId: v.id("highlights") },
  handler: async (ctx, { highlightId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");
    const highlight = await ctx.db.get(highlightId);
    if (!highlight || highlight.userId !== userId) throw new Error("Highlight not found");
    await ctx.db.delete(highlightId);
  },
});
