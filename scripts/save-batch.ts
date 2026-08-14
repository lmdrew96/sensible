/**
 * Saves a batch of hand-modernized drafts (produced without the Anthropic
 * API) to Convex.
 *
 * Usage: pnpm tsx --env-file=.env.local scripts/save-batch.ts <path-to-json>
 * JSON shape: [{ "sectionId": "...", "modernized": "..." }, ...]
 */
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: save-batch.ts <path-to-json>");
    process.exit(1);
  }

  const entries: { sectionId: string; modernized: string }[] = JSON.parse(
    readFileSync(filePath, "utf-8"),
  );

  let saved = 0;
  let failed = 0;
  for (const e of entries) {
    try {
      await client.mutation(api.sections.saveDraft, {
        sectionId: e.sectionId as any,
        modernized: e.modernized,
      });
      saved++;
    } catch (err) {
      failed++;
      console.error(`FAILED ${e.sectionId}:`, String(err).slice(0, 200));
    }
  }
  console.log(`Saved ${saved} drafts, ${failed} failed (of ${entries.length})`);
}

main();
