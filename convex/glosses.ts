import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

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

// Every gloss term (suggested or approved) already recorded anywhere in a
// text -- used by glossify.suggestGlossesForSection so the same term isn't
// suggested again in a later section.
export const listTermsForText = query({
  args: { textId: v.id("texts") },
  handler: async (ctx, { textId }) => {
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_text", (q) => q.eq("textId", textId))
      .collect();
    const terms: string[] = [];
    for (const section of sections) {
      const glosses = await ctx.db
        .query("glosses")
        .withIndex("by_section", (q) => q.eq("sectionId", section._id))
        .collect();
      for (const g of glosses) terms.push(g.term);
    }
    return terms;
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
      await ctx.db.insert("glosses", { sectionId, ...s, status: "suggested", source: "ai_sweep" });
    }
    await ctx.db.patch(sectionId, { glossCheckedAt: Date.now() });
  },
});

// Point lookup for glossify.requestGloss's dedup check -- a reader asking
// about a term that's already been requested or AI-suggested for this
// section should bump the existing row instead of paying for another
// Anthropic call.
export const findByTerm = internalQuery({
  args: { sectionId: v.id("sections"), term: v.string() },
  handler: async (ctx, { sectionId, term }) => {
    return await ctx.db
      .query("glosses")
      .withIndex("by_section_and_term", (q) => q.eq("sectionId", sectionId).eq("term", term))
      .first();
  },
});

export const bumpRequestCount = internalMutation({
  args: { glossId: v.id("glosses") },
  handler: async (ctx, { glossId }) => {
    const gloss = await ctx.db.get(glossId);
    if (!gloss) return;
    await ctx.db.patch(glossId, { requestCount: (gloss.requestCount ?? 0) + 1 });
  },
});

// Called only from glossify.requestGloss for a term with no existing gloss
// row in this section.
export const createFromRequest = internalMutation({
  args: { sectionId: v.id("sections"), term: v.string(), explanation: v.string() },
  handler: async (ctx, { sectionId, term, explanation }) => {
    return await ctx.db.insert("glosses", {
      sectionId,
      term,
      explanation,
      status: "suggested",
      source: "reader_request",
      requestCount: 1,
    });
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
