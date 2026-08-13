/**
 * Bulk-triggers Claude draft generation for every "pending" section of a
 * text. Runs with modest concurrency to keep wall-clock reasonable without
 * hammering the API.
 *
 * Usage: pnpm generate-drafts <text-slug>
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set. Source .env.local first.");
}
const client = new ConvexHttpClient(CONVEX_URL);

const CONCURRENCY = 5;
const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: pnpm generate-drafts <text-slug>");
    process.exit(1);
  }

  const text = await client.query(api.texts.getBySlug, { slug });
  if (!text) throw new Error(`No text with slug "${slug}"`);

  const sections = await client.query(api.sections.listAllByText, { textId: text._id });
  const queue = sections.filter((s) => s.status === "pending");
  console.log(`${text.title}: generating drafts for ${queue.length}/${sections.length} sections`);

  let done = 0;
  let failed = 0;
  const started = Date.now();

  async function worker() {
    let section: Doc<"sections"> | undefined;
    while ((section = queue.shift())) {
      let attempt = 0;
      for (;;) {
        attempt++;
        try {
          await client.action(api.modernize.generateDraft, { sectionId: section._id });
          done++;
          if (done % 25 === 0) console.log(`  ${done} done, ${failed} failed`);
          break;
        } catch (err) {
          const retryable = String(err).includes("overloaded_error") || String(err).includes("rate_limit");
          if (retryable && attempt < MAX_ATTEMPTS) {
            await sleep(1000 * attempt);
            continue;
          }
          failed++;
          console.error(`  FAILED section ${section._id}:`, String(err).slice(0, 200));
          break;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Done in ${seconds}s: ${done} succeeded, ${failed} failed`);
}

main();
