# Godot pickup — Claude Code (2026-09-06)

**Audience:** Claude Code on the Godot / landscape build.
**Baseline:** `main` at `f3e7997` (merge of #52) — `VERSIONS.md` **v4.42** (growth-loop web catch-up; Godot unchanged).
**Live web:** https://mbace1.github.io/piritori-eden/ (hub / Suds-Jack inherits later).

This is a session handoff, not new canon. Authority order is still
`CLAUDE.md` → `DESIGN_AUTHORITY.md` → locks / GDD / COMBAT / QUEUE.
When this file conflicts with those, they win.

---

## Do this first

```bash
git fetch origin
git checkout main
git pull --ff-only
cd godot
node tools/sync-data.mjs
node tools/sync-data.mjs --check
node tools/check-locale.mjs
# then headless gates you usually run (spine, battle, shell, …)
```

Open the editor on this checkout. Do **not** reinvent Phase A leftovers,
Phase B, or Phase D growth-loop — Godot already had D; v4.42 was web catch-up.

---

## Already on main (do not re-port)

| Version | What | Godot status |
|---|---|---|
| v4.35 | Ochre cover markers on 3D board | In (`battle_stage_3d.gd`) |
| v4.36 | Telegraph `harm N-M` / lethal | In (`IntentRecord` + `_telegraph_line`) |
| v4.37 | Aim-unclear intel footnote | In (intent panel) |
| v4.38 | Battle-entry forecast | In (`BattleBuilder.entry_forecast`) |
| v4.39 | Cover decision copy + fence taken-only tag | Web catch-up; Godot already had cover copy |
| **v4.40** | **Phase B:** `tough` desync, taken-only tier, equipment shop | **In** (see below) |
| **v4.42** | **Phase D:** growth-loop web catch-up (levels/perks/skills/train) | **Already in** — web-only this version |

### Phase B detail (v4.40) — verify in Godot, don’t rebuild

1. **Desync / tough** (`COMBAT.md` §9.13)
   - `Fighter.tough`; content on mikko / risto / jouni / training-anchor.
   - After the **first SYNC** hit on a tough target each round, further sync
     allies skip. Primary attack still hits. Forecast empties once desynced.
   - Files: `fighter.gd`, `fight_manager.gd`, `battle_builder.gd`,
     `content/era1-slice-v1.json`, `test_battle.gd` (desync suite).

2. **Taken-only tier**
   - `tire-iron` (pipe-v03 art, on Risto) and `lifted-handgun` (handgun-v03,
     on Wei Tan), plus existing `chain` / `sawn-off`.
   - Not purchasable; fence still sells. Locale keys in `godot/locale/ui.csv`.

3. **Equipment shop**
   - Piritori only (`can_shop_here`, same corner as fence).
   - `buy_eur` on market gear (provisional ~2.5–3× resale — DESIGN_LOCKS §13).
   - `GameState.buy_equipment` + `app_shell._add_shop()`.
   - Refuses taken-only and short cash; gates in `test_spine.gd`.

---


### Phase D detail (v4.42) — web catch-up; Godot already had it

Growth-loop (levels / perks / skills / `train()`) was already live in
`game_state.gd` + `app_shell.gd` + `fight_manager.gd`. **v4.42 ports it to
web only** — do not rebuild on Godot. Smoke the crew rail spend/learn and
a toughness-buffed fight if verifying parity; no new Godot work in this
version.


## Art / 3D locks (do not burn credits)

- Fight look = **cast3d on 2D plates**. `USE_STAGE3D_ARENAS` stays false;
  stage3d dioramas parked until they look better (owner).
- **Meshy cast migrate + one shared clip re-export** deferred ~**2026-09-11**.
  No one-off re-rigs (incompatible 24-joint / no-Head1 family; ~110° drift).
- Shared Idle/Attack/BeHit/Dead clips are wired for **muscle-v01** only;
  other roles stay on procedural / fight-motion until the cast-wide migrate.
- Always show **2D T-poses** for review before any Meshy/3D generation.

---

## What Claude Code should do on this pickup

1. Pull `main` and sync data (commands above).
2. Smoke the Godot build in landscape:
   - Piritori ledger: fence sell + **shop BUY** on market gear.
   - A fight with a tough muscle: sync chain stops after the first SYNC hit;
     forecast matches.
   - Cover markers visible; entry forecast / telegraph harm still readable.
3. If anything above is missing in *your* tree, you are behind `main` —
   rebase/pull; do not re-implement from web diffs.
4. Only open new Engine work from `QUEUE.md` / owner ask. Append notices to
   QUEUE; don’t silently widen scope (`CLAUDE.md` rule 1).

---

## Still open (not this pickup)

- Owner Phase A playtest gate: “would you fight ten?”
- Meshy cast migrate ~Sept 11, then arenas.
- Hub (Suds-Jack) inherits fight advances later — do not chase hub deploy.
- Web-only bits that are not Godot debt: nameplate overlap solver (v4.32),
  web mood light knobs (v4.33).
- Pre-existing `test_battle` noise around parked empty `STAGE_BY_SCENE` +
  headless locale load — unrelated to Phase B; don’t “fix” by inventing
  stage3d content.

---

## Pointers

| File | Why |
|---|---|
| `VERSIONS.md` | Port blocks from v4.33 → v4.40 |
| `QUEUE.md` | Struck Phase B gaps; remaining backlog |
| `COMBAT.md` §9.13 | Desync rules |
| `PORTING.md` | web leads behaviour; Godot is landscape/controller port |
| `CLAUDE.md` | Session rules, lanes, gates |
| `GODOT_HANDOFF.md` | Older port structure (baseline commit there is stale; use this file’s SHA) |

## Blender / cast migrate (~Sept 11)

- Box has **Blender 5.2.1 LTS** (`blender` on PATH).
- Runbook: `art-src/meshy-input/MESHY_CAST_MIGRATE.md`
- Eye audit: `xvfb-run -a blender --background --python art-src/tools/blender_cast_clip_audit.py`
- Until migrate: shared Idle/Attack/BeHit/Dead play on **nobody** (Eeri overwrite restored; Piritori muscle is back, clips still unmatched).
