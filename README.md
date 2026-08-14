# Sensible

A side-by-side reader for old writings. Side A shows the original text; Side B shows a modernized version in plain contemporary English that preserves the original's exact meaning, tone, and rhetorical intent — Paine's urgency stays urgent, Austen's irony stays ironic.

Modernizations are generated once via the Claude API, human-reviewed and approved in an admin workflow, then served as static content. Nothing is generated live or per-reader.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Backend**: [Convex](https://convex.dev) — texts, sections, and the modernization pipeline
- **AI**: Claude API (`@anthropic-ai/sdk`) for draft-time modernization generation
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Markdown rendering**: `react-markdown` + `remark-gfm`

## Getting Started

### Prerequisites

- Node.js
- pnpm (`packageManager: pnpm@10.17.0`)
- A Convex account (`npx convex dev` will prompt you to log in / create a project on first run)
- An Anthropic API key (only needed for draft generation, not for reading/browsing)

### Installation

```bash
pnpm install
npx convex dev   # provisions a Convex deployment and writes .env.local
```

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL, written automatically by `npx convex dev` | Yes |
| `CONVEX_DEPLOYMENT` | Convex deployment identifier, written automatically by `npx convex dev` | Yes |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex HTTP actions URL, written automatically by `npx convex dev` | Yes |
| `ANTHROPIC_API_KEY` | Claude API key, used server-side by `convex/modernize.ts` to generate draft modernizations | Yes, for draft generation |
| `ADMIN_PASSWORD` | Single shared password gating `/admin/*` and unpublished `/read/*` pages (see `src/proxy.ts`) | Yes |

`.env.local.example` currently only lists `NEXT_PUBLIC_CONVEX_URL` — copy it to `.env.local` and add the other four variables above before running anything that touches Convex or the admin routes.

### Running Locally

```bash
pnpm dev          # Next.js dev server (http://localhost:3000)
npx convex dev     # Convex dev deployment, run alongside in a second terminal
```

## How It Works

**Content model:**

```
Text
  → Sections (paragraph-aligned)
      → { original, modernized?, gloss? }
```

Each `text` has a `status` of `draft` or `published`; only published texts are listed at `/read`. Each `section` has a `status` of `pending` → `draft` → `approved`; only `approved` sections are ever served to readers (see `convex/sections.ts:listApprovedByText`).

**Admin review workflow:**
1. Import source content into `pending` sections (`pnpm import-texts`)
2. Generate a draft modernization per section, either via the Claude API (`pnpm generate-drafts <slug>`) or by hand-modernizing a batch (`fetch-batch.ts` / `save-batch.ts`)
3. An admin reviews and edits each draft at `/admin/[slug]`, then approves it (individually or via bulk-approve)
4. Once every section is approved, the text is published and appears at `/read`

## Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/read` | Public library — lists published texts |
| `/read/[slug]` | Split-view reader (original / modernized, synced scroll) |
| `/admin` | Admin dashboard — list of all texts and review progress |
| `/admin/[slug]` | Per-text section review UI (draft → edit → approve) |
| `/admin/login` | Admin login form |
| `/api/admin-login` | Sets the `admin_auth` cookie on correct password |
| `/api/admin-logout` | Clears the `admin_auth` cookie |

Admin auth is a single shared password (`ADMIN_PASSWORD`), not a full auth provider — enforced in `src/proxy.ts`, which gates `/admin/*` and redirects to login for unpublished `/read/*` pages.

## Convex Functions

**`convex/texts.ts`**
| Function | Type | Description |
|---|---|---|
| `listPublished` | query | All texts with `status: "published"`, ordered by `libraryOrder` |
| `listAll` | query | All texts regardless of status (admin) |
| `get` | query | Fetch a text by ID |
| `getBySlug` | query | Fetch a text by slug |
| `create` | mutation | Insert a new text as `draft` |
| `publish` | mutation | Flip a text's status to `published` |
| `remove` | mutation | Delete a text and all its sections |

**`convex/sections.ts`**
| Function | Type | Description |
|---|---|---|
| `get` | query | Fetch a section by ID |
| `listApprovedByText` | query | Approved sections for a text, sorted by order — what readers see |
| `listAllByText` | query | All sections for a text regardless of status (admin) |
| `create` | mutation | Insert a new `pending` section |
| `saveDraft` | mutation | Save a modernized draft + gloss, sets status to `draft` |
| `approve` | mutation | Approve a single section |
| `approveAll` | mutation | Approve all `draft` sections for a text in bulk |
| `remove` | mutation | Delete a section |

**`convex/modernize.ts`**
| Function | Type | Description |
|---|---|---|
| `generateDraft` | action | Calls the Claude API to modernize one section's `original` text, guided by the text's `difficultyType` (`vocabulary` / `syntax` / `poetic`), and saves the result as a draft |

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `pnpm import-texts` | One-time import of the v1 text library (Standard Ebooks, National Archives, Wikisource, Gutenberg) into `pending` sections — see `scripts/import.ts` for per-text sourcing |
| `pnpm generate-drafts <slug>` | Bulk-trigger Claude draft generation for every pending section of a text, with retry and concurrency |

Two additional scripts aren't wired into `package.json` and are run directly with `pnpm tsx --env-file=.env.local`:

| Script | Description |
|---|---|
| `scripts/fetch-batch.ts <slug> <batchIndex> <batchSize>` | Prints a JSON batch of pending sections for hand-modernization (no API call) |
| `scripts/save-batch.ts <path-to-json>` | Saves a batch of hand-modernized drafts back to Convex |

## Deployment

Deploy the Next.js app to Vercel and the Convex backend with `npx convex deploy`. Set `ANTHROPIC_API_KEY` and `ADMIN_PASSWORD` as environment variables in both the Vercel project and the Convex deployment (Convex actions run server-side and need their own copy of `ANTHROPIC_API_KEY`).

## Project Structure

```
convex/           Convex schema, queries/mutations/actions
scripts/          One-off and batch content-import/generation scripts
src/app/          Next.js App Router pages (/, /read, /admin, /api)
src/components/   Shared React components (Convex provider, Markdown renderer, admin row)
src/proxy.ts      Admin-auth + unpublished-content gating (Next.js proxy/middleware)
spec.md           Product spec — content model, v1 text library, feature scope
```
