/**
 * Fetches one batch of pending sections for a text, for hand-modernization
 * (no Anthropic API call) by an agent. Prints JSON to stdout.
 *
 * Usage: pnpm tsx --env-file=.env.local scripts/fetch-batch.ts <slug> <batchIndex> <batchSize>
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
  const slug = process.argv[2];
  const batchIndex = Number(process.argv[3]);
  const batchSize = Number(process.argv[4]);
  if (!slug || Number.isNaN(batchIndex) || Number.isNaN(batchSize)) {
    console.error("Usage: fetch-batch.ts <slug> <batchIndex> <batchSize>");
    process.exit(1);
  }

  const text = await client.query(api.texts.getBySlug, { slug });
  if (!text) throw new Error(`No text with slug "${slug}"`);

  const sections = await client.query(api.sections.listAllByText, { textId: text._id });
  const pending = sections.filter((s) => s.status === "pending").sort((a, b) => a.order - b.order);
  const batch = pending.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);

  console.log(
    JSON.stringify(
      {
        title: text.title,
        author: text.author,
        year: text.year,
        difficultyType: text.difficultyType,
        sections: batch.map((s) => ({ sectionId: s._id, order: s.order, original: s.original })),
      },
      null,
      2,
    ),
  );
}

main();
