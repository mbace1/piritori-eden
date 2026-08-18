# Claude Code handoff — Piritori → Eden

Owner handoff, 2026-08-16.

## Purpose of this PR

This PR is the shared design and conversation anchor for a new project in the
Suds-Jack repository. It contains no runtime implementation and must remain
isolated from existing games.

Read in this order:

1. BRIEF.md
2. SHARED_ENGINE.md
3. references/toko-move-2021-concept.jpg
4. the repository root CLAUDE.md for repo-wide conventions

## First response requested from Claude Code

Reply in the PR conversation before writing code. The reply should contain:

1. a short critique of the core combination: Drug Wars market pressure plus a
   visible people/transport flow game;
2. the smallest five-minute prototype that can prove or disprove the idea;
3. a proposed file/module layout for flow-core, piritori and toko-move;
4. the two highest design risks and two highest technical risks;
5. a direct recommendation on the working definition of Eden;
6. a question identifying which Weed Wars version the owner means;
7. any contradiction found between this brief and current repository rules.

Do not answer with a large production roadmap. Do not start implementing until
the owner responds to the open decisions or explicitly asks for the prototype.

## Hard constraints

- This is not the earlier handcrafted exploration interpretation.
- Mobile-first.
- Two product entry points from the first playable slice.
- Ordinary people movement and hidden/product movement share the same graph and
  capacity.
- Toko Move must be fully family-friendly and contain no leaked drug wording or
  assumptions.
- Piritori has no combat layer.
- No real-world trafficking data or attempt at operational realism.
- Do not clone Mini Metro station shapes, line language or Mini Motorways
  coloured-house/pin grammar.
- No changes to the arcade hub, gh-pages or unrelated games in the brief PR.
- Keep the first code slice small, deterministic and testable.

## Current design unknowns

- Eden’s final meaning.
- Exact Weed Wars reference.
- Named protagonist versus unnamed operator.
- Final campaign duration.
- Explicit versus fictional product names.

These are discussion items, not gaps to silently fill.

## Suggested PR sequence after approval

1. Neutral flow-core lab plus two minimal skins.
2. Route editing, queues and phone interaction.
3. Piritori market/debt/heat prototype.
4. Toko Move day/access/pollution prototype.
5. Narrative contacts and product-specific event passes.
6. Art and audio identity after the loop survives play.

Each PR should keep both products runnable whenever shared core behavior changes.
