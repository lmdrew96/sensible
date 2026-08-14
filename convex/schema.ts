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
  })
    .index("by_slug", ["slug"])
    .index("by_libraryOrder", ["libraryOrder"]),

  sections: defineTable({
    textId: v.id("texts"),
    order: v.number(),
    original: v.string(),
    speaker: v.optional(v.string()),
    modernized: v.optional(v.string()),
    gloss: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("draft"),
      v.literal("approved"),
    ),
    approvedAt: v.optional(v.number()),
  }).index("by_text", ["textId", "order"]),
});
