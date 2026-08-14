import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  texts: defineTable({
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
    status: v.union(v.literal("draft"), v.literal("published")),
    glossSweepActive: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
    .index("by_libraryOrder", ["libraryOrder"]),

  sections: defineTable({
    textId: v.id("texts"),
    order: v.number(),
    original: v.string(),
    speaker: v.optional(v.string()),
    modernized: v.optional(v.string()),
    glossCheckedAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("draft"),
      v.literal("approved"),
    ),
    approvedAt: v.optional(v.number()),
  }).index("by_text", ["textId", "order"]),

  glosses: defineTable({
    sectionId: v.id("sections"),
    term: v.string(),
    explanation: v.string(),
    status: v.union(v.literal("suggested"), v.literal("approved")),
  }).index("by_section", ["sectionId"]),

  highlights: defineTable({
    sectionId: v.id("sections"),
    side: v.union(v.literal("original"), v.literal("modernized")),
    userId: v.id("users"),
    startOffset: v.number(),
    endOffset: v.number(),
    text: v.string(),
    note: v.optional(v.string()),
  }).index("by_section_and_side_and_user", ["sectionId", "side", "userId"]),
});
