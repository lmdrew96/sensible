import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const listForSection = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    return await ctx.db
      .query("glosses")
      .withIndex("by_section", (q) => q.eq("sectionId", sectionId))
      .collect();
  },
});

export const listApprovedForSection = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    const glosses = await ctx.db
      .query("glosses")
      .withIndex("by_section", (q) => q.eq("sectionId", sectionId))
      .collect();
    return glosses.filter((g) => g.status === "approved");
  },
});

// Called only from glossify.generateSuggestions -- replaces this section's
// not-yet-approved suggestions with a fresh batch, leaving approved glosses
// untouched so re-running suggestions doesn't undo prior admin approvals.
export const replaceSuggestions = internalMutation({
  args: {
    sectionId: v.id("sections"),
    suggestions: v.array(v.object({ term: v.string(), explanation: v.string() })),
  },
  handler: async (ctx, { sectionId, suggestions }) => {
    const existing = await ctx.db
      .query("glosses")
      .withIndex("by_section", (q) => q.eq("sectionId", sectionId))
      .collect();
    for (const g of existing) {
      if (g.status === "suggested") await ctx.db.delete(g._id);
    }
    for (const s of suggestions) {
      await ctx.db.insert("glosses", { sectionId, ...s, status: "suggested" });
    }
    await ctx.db.patch(sectionId, { glossCheckedAt: Date.now() });
  },
});

export const approve = mutation({
  args: { glossId: v.id("glosses") },
  handler: async (ctx, { glossId }) => {
    await ctx.db.patch(glossId, { status: "approved" });
  },
});

export const remove = mutation({
  args: { glossId: v.id("glosses") },
  handler: async (ctx, { glossId }) => {
    await ctx.db.delete(glossId);
  },
});
