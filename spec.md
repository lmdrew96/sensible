# Sensible — Project Spec

## What it is
A side-by-side reader for old writings. Side A shows the original text; Side B shows a modernized version in plain contemporary English. The modernization preserves the original's exact meaning, tone, and sentiment — it simplifies vocabulary and syntax, not intent.

The name is a pun on the origin text (Paine's *Common Sense*): the goal is to put things in **common** language so they make **sense**.

## Origin & use case
Sparked by wanting to read *Common Sense* for enjoyment without fighting 18th-century prose. Not built specifically for classrooms, but designed to be classroom-viable — accurate enough that a teacher could hand it to students without worrying the modernization drifted from the source.

## Core mechanic
**Paragraph-aligned split view**, synced scroll position, so a reader can move between original and modern text mid-section without losing their place. This is the thing most "modernizer" tools get wrong — they dump a full simplified text below the original instead of keeping them locked together.

## What makes this different from typical modernizers
Most tools simplify vocabulary and flatten tone in the process. Sensible explicitly preserves **register and rhetorical intent** — Paine's urgency should still read as urgent, Austen's irony should still read as ironic. This is a hard constraint on the modernization generation step, not a nice-to-have.

## Content model
- **Pre-generated, not live.** Modernizations are generated once via the Claude API, human-reviewed and approved, then served as static content. No per-reader or per-request generation.
- **Same output for every reader.** Side B is not personalized — it's a single approved canonical version per text.
- **Data shape:**
  ```
  Text
    → Sections (paragraph-aligned)
        → { original, modernized, gloss? }
  ```
- Texts sourced from Project Gutenberg (all public domain).

## Difficulty types (informs modernization prompts)
Not all "hard to read" is the same kind of hard — the AI prompt used for generating Side B should account for which type a text is:

| Type | What's hard | Example |
|---|---|---|
| Archaic vocabulary/idiom | Words changed meaning or died out | Common Sense, Austen |
| Syntax/sentence structure | Long, nested, inverted clauses | Legal texts, Emerson/Thoreau |
| Poetic/rhetorical structure | Rhythmic, dense, allusive | Bible passages, Shakespeare |

v1 is scoped to **modern-but-archaic English only** (roughly 1776–1915). True old/Middle English (Chaucer, Beowulf) is an explicit v2+ goal and needs a different approach — likely closer to translation than modernization, possibly interlinear gloss UI instead of side-by-side.

## V1 Text Library (10 texts, launching together)
1. Common Sense (Paine, 1776)
2. The Declaration of Independence (1776)
3. Macbeth (Shakespeare)
4. Pride and Prejudice (Austen, 1813)
5. Jane Eyre (Brontë, 1847)
6. Walden (Thoreau, 1854)
7. The U.S. Constitution + Bill of Rights
8. The Communist Manifesto (Marx & Engels, 1848, English trans.)
9. Self-Reliance (Emerson, 1841)
10. The Metamorphosis (Kafka, 1915 Muir translation)

**Note on Metamorphosis:** Side A is already a translation (Kafka wrote in German), not Kafka's original words. UI should be upfront about this — label Side A as "original English translation (Muir, 1915)" rather than implying it's the author's own text.

**Launch decision:** all 10 ship together, not staggered. This means all ~10 texts need full paragraph-level review before v1 goes live — plan the admin review workflow to not bottleneck this.

## Core features (v1)

### 1. Split-view reader
- Side A (original) / Side B (modernized), paragraph-aligned
- Synced scroll
- Toggle to collapse to single-side reading (Side B only, for readers who find the original overwhelming)

### 2. Admin review workflow
- Claude API generates a draft modernization per section/paragraph
- Draft → admin edits → admin approves
- Only approved content is ever served to readers
- This is the workflow that gates the entire v1 launch — build it early, not last

### 3. Highlight & annotate
- Readers can highlight text and add personal annotations
- Applies to either side of the split view
- Not classroom-specific — just a general reading tool feature

## Suggested stack
Matches existing ADHDesigns ecosystem conventions:
- **Next.js + TypeScript**
- **Convex** for storing texts, sections, and modernizations — note: keep an eye on free-tier storage limits given the existing ScribeCat Convex overage situation. This app is text-heavy but not audio/media-heavy, so likely fine, but worth monitoring as the library grows.
- **Claude API** for modernization generation (draft-time only, not live/per-request)
- **Cloudflare R2** if any heavier assets get added later (scanned original pages, audio, etc.) — pattern already established via NonStop

## Explicitly out of scope for v1
- Old/Middle English texts (Chaucer, Beowulf, etc.) — planned for v2+
- Live/per-reader generation of modernizations
- User-uploaded arbitrary texts
- Comprehension questions / classroom-specific quiz features (not ruled out forever, just not v1)

## Open questions for implementation
- Exact section/paragraph chunking strategy per text (some texts like the Constitution have natural section breaks; others like Pride and Prejudice will need paragraph-level chunking)
- Gloss format: inline popover vs. footnote vs. sidebar, for historical/contextual references
- Admin UI: standalone route in the same app, or separate internal tool
