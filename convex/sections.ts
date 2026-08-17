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

export const saveOriginal = mutation({
  args: {
    sectionId: v.id("sections"),
    original: v.string(),
    speaker: v.optional(v.string()),
  },
  handler: async (ctx, { sectionId, original, speaker }) => {
    await ctx.db.patch(sectionId, { original, speaker });
  },
});

// Inserts a blank pending section between two existing ones (or at the very
// start when afterSectionId is omitted) using a fractional order -- cheaper
// than renumbering every sibling, and other queries only need order values
// to be mutually consistent, not contiguous integers.
export const insertAfter = mutation({
  args: {
    textId: v.id("texts"),
    afterSectionId: v.optional(v.id("sections")),
  },
  handler: async (ctx, { textId, afterSectionId }) => {
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_text", (q) => q.eq("textId", textId))
      .collect();
    sections.sort((a, b) => a.order - b.order);

    let order: number;
    if (!afterSectionId) {
      order = sections.length > 0 ? sections[0].order - 1 : 0;
    } else {
      const idx = sections.findIndex((s) => s._id === afterSectionId);
      if (idx === -1) throw new Error("Section not found");
      const next = sections[idx + 1];
      order = next ? (sections[idx].order + next.order) / 2 : sections[idx].order + 1;
    }

    return await ctx.db.insert("sections", { textId, order, original: "", status: "pending" });
  },
});

// Swaps this section's order with its immediate predecessor, if any.
export const moveUp = mutation({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    const section = await ctx.db.get(sectionId);
    if (!section) throw new Error("Section not found");
    const prev = await ctx.db
      .query("sections")
      .withIndex("by_text", (q) => q.eq("textId", section.textId).lt("order", section.order))
      .order("desc")
      .first();
    if (!prev) return;
    await ctx.db.patch(section._id, { order: prev.order });
    await ctx.db.patch(prev._id, { order: section.order });
  },
});

// Swaps this section's order with its immediate successor, if any.
export const moveDown = mutation({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    const section = await ctx.db.get(sectionId);
    if (!section) throw new Error("Section not found");
    const next = await ctx.db
      .query("sections")
      .withIndex("by_text", (q) => q.eq("textId", section.textId).gt("order", section.order))
      .order("asc")
      .first();
    if (!next) return;
    await ctx.db.patch(section._id, { order: next.order });
    await ctx.db.patch(next._id, { order: section.order });
  },
});

// Merges this section with the one immediately following it: original and
// modernized text are concatenated, and the result drops back to "draft" (or
// "pending" with no modernized text) since the merged content needs a fresh
// approval pass. Glosses/highlights on the absorbed section are left as-is,
// same as sections.remove -- they're already orphaned rather than cascaded.
export const mergeWithNext = mutation({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    const section = await ctx.db.get(sectionId);
    if (!section) throw new Error("Section not found");
    const next = await ctx.db
      .query("sections")
      .withIndex("by_text", (q) => q.eq("textId", section.textId).gt("order", section.order))
      .order("asc")
      .first();
    if (!next) throw new Error("No following section to merge with");

    const original = [section.original, next.original].filter(Boolean).join("\n\n");
    const modernizedParts = [section.modernized, next.modernized].filter(Boolean);
    const modernized = modernizedParts.length > 0 ? modernizedParts.join("\n\n") : undefined;

    await ctx.db.patch(section._id, {
      original,
      modernized,
      speaker: section.speaker ?? next.speaker,
      status: modernized ? "draft" : "pending",
      approvedAt: undefined,
      glossCheckedAt: undefined,
    });

    await ctx.db.delete(next._id);
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
