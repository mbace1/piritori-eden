# Piritori Option C — source and live delivery

Owner direction: merge and publish tested playable batches to the Piritori
repository **and** the Suds Jack hub. No repeated permission request is needed.
Read AGENTS, ACTIVE_CONTEXT and DESIGN_AUTHORITY first. Follow Suds Jack's
`AGENTS.md` and `.claude/skills/hub-release/SKILL.md` for the public release.

## Current route

- Hub repository: `mbace1/Suds-Jack`, live branch `gh-pages`, source mirror `main`.
- Lab cabinet: `piritori-c09/`; hub card ID `optionc-lab`.
- C.09 entry: `web/arena-lab/?actors=6&release=9`.
- Historical C.09.1 entry: `web/arena-lab/?actors=6&release=9.1`.
- Historical C.10.1 entry: `web/arena-lab/?actors=6&release=10.1`.
- Historical C.11 entry: `web/arena-lab/?actors=6&release=11`.
- Historical C.12 entry: `web/crew-run/?release=12`.
- Historical C.13 entry: `web/crew-run/?release=13`.
- Historical C.14 entry: `web/crew-run/?release=14`.
- Current C.15 entry: `web/crew-run/?release=15`.
- Current release receipt: [C15_RELEASE.json](C15_RELEASE.json), source PR #80 and hub PR #519. Earlier batches: C14_RELEASE.json (PR #79 / #518), C13_RELEASE.json, C12_RELEASE.json and C11_RELEASE.json.
- `piritori-c09/release.json` records the deployed source commit and build.
- Preserve the `optionc` authored Bear Path card and the `piritori` campaign card.

C.09 source PR #69 merged at `d74f966adb6f47322e46c554d898c719bf2bdf52` into
`art/meshy-approved-pilots-2026-09-11`. Initial hub publication:
`7eaf6ab3b100d49295dc0d2d9d80e59bbce8aaf5`, successful Pages run `34747147037`.
The public hub card → arena, movement, ranged damage and restart were verified.
Do not merge the entire older stacked PR #68 as a deployment shortcut.

## Stage the current laboratory from a clean, tested source commit

Fetch the current hub cabinet's `art/v3/manifest.json` to a local file. Preserve
its pinned fighter URLs and identities. The laboratory downloads no fighter
models, but the shared loader still needs its scoped runtime register.

```sh
python tools/publish/arena_lab_release.py --commit <tested-40-character-SHA> \
  --deployed-manifest <current-hub-manifest.json> --output <new-empty-directory>
```

`arena_lab_files.json` is the explicit runtime allowlist. The script validates
environment bytes/hashes and module cache-token consistency, derives the scoped
manifest, and records per-file SHA256 in `release.json`. It does no network work,
art generation or upload. It refuses an existing output directory so obsolete
files cannot silently survive. The caller must use a clean checkout of the
named commit; supplying a SHA is provenance, not proof of checkout identity.

Serve that generated folder under `/Suds-Jack/piritori-c09/` and run the browser
gates against its actual arena URL. Do not directory-copy a source checkout,
art-library, intermediate concepts, credentials, raw masters or signed URLs.

## Publish and finish

1. Push the tested source batch, review the exact head and relevant CI, merge it.
2. Read the latest hub branches. Apply only this cabinet and its catalogue/cache
   entries. Same-repository Git blob SHAs may reuse already-published binaries.
3. Update the visible build, game metadata, catalogue module and transitive hub
   entry cache tokens; update the service worker shell entries to match. Regenerate
   `AnotherHUB/index.html` from that branch’s root with its relative base and
   update only this cabinet in `hub/versions.json`. Verify both. Preserve
   other games and their concurrent changes. Never force-update the live branch.
4. Reconcile a direct `gh-pages` deployment back to `main` with a game-scoped PR.
   Do not copy the whole live root over a newer/different development root.
5. Wait for successful Pages deployment, then open the hub card and play through
   the real interface. Verify `release.json` and changed runtime hashes.
6. Record the PR, source merge, hub commit/run, route and remaining acceptance
   gaps. Tell the owner the build is live only after public verification.

Document-only follow-ups do not require a new game version. A source push, merge,
Pages build and public play check are separate facts. Physical Pixel/iPad and
final F01/F02 motion acceptance remain separate gates.

## C.09.1 delivery and staging lesson

Source PR #70 is merged at `daddf4808bf3470170be5d89bee193741461204a`.
The public C.09.1 card, movement, damage and 12-person fixture were verified.
All 38 cabinet Git blobs were compared against staging. See
[C091_RELEASE.json](C091_RELEASE.json) for current hub/merge evidence and limits.

For byte-exact Windows staging, export the named commit with `git archive` and
pass that exported root as `--source`. A clean working tree can still have
checkout line-ending conversion. Do not normalize all files: several scripts
are LF while the shared stylesheet is deliberately CRLF in Git. Preserve each
Git blob's bytes before calculating the release receipt.

The lab owns its header HOME link and native controller (`hubHome: native` in
the hub catalogue). The common-shell key-bridge test must use a common-shell
host; all cabinets, including this one, still undergo HOME/link/44px checks.

Hub source reconciliation PR #511 merged at `801c95a8702f7e77e618dbf7dd4c8bb17c19cd76` after both current-head hub gates passed. Pages run `34748673795` succeeded on attempt 2 after a transient deployment HTTP 500; C.09.1 was reopened from the public hub card after that deployment. The hub smoke server must serve `.mjs` as JavaScript, matching Pages, so shared market/people imports execute during all-cabinet checks.
