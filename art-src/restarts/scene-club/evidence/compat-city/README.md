# City compatibility browser audit — 2026-11-08

Read-only local audit of the remaining existing city gates after the next-step functional-style fix. No repository source or tests were changed by this audit.

Source HEAD at start: `980b7dad7c0e517b6573ae807de4537ee06debdf`. CSS/index were the uncommitted functional patch under audit. Bytes stayed identical before/after every suite and across the full batch.

| Existing suite | Passed | Failed | Exit |
|---|---:|---:|---:|
| `opening.cjs` | 54 | 2 | 1 |
| `story-browser.cjs` | 30 | 0 | 0 |
| `chapter-browser.cjs` | 20 | 0 | 0 |
| `standing-browser.cjs` | 22 | 0 | 0 |
| `road-browser.cjs` | 42 | 0 | 0 |
| `doors-browser.cjs` | 52 | 0 | 0 |
| `aatami-browser.cjs` | 16 | 0 | 0 |
| `mission-browser.cjs` | 32 | 0 | 0 |

The seven non-opening gates passed **214/0**. Opening passed 54 with two failures: desktop and phone `.op-tram` computed transform is `none`. Skip button, scene tap, auto-close, authored dialogue/audio/mute, reduced-motion/static and save-safety checks passed. Following the owner’s instruction to delete the old visual basis, this implementation replaces the retired tram markup with a bounded neutral text sheet. The fresh opening rerun is recorded separately below; this initial batch is preserved unchanged.

## Commands and environment

Each command ran from `/workspace/piritori-visual-reset` with:

```sh
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules node web/test/<suite>
```

Exact expanded commands, UTC times, per-suite hashes and exit codes are in [results.json](results.json). Full stdout/stderr is `<suite>.log`; [batch.log](batch.log) is the concise runner transcript. The runner used the matching Playwright Chromium headless shell, with each existing suite unchanged. Its 600-second infrastructure deadline did not trigger.

## Frozen hashes

```text
0cda72d4456a596fc022993f40622d01cf48c4f004667cafff53ed11ef5f7e6d  web/v3.css
6aa2f5642dadcc2090d0e5e87790bfb380ea7597be7a212fc0e263813f2fd76c  web/index.html
9cf398eb8496f366e479845db510e83a49e4f7a03bc56ec92a47d53db6714f74  web/js/v3/app.js
```

## Scope and limits

Road, doors, Aatami and mission suites stub the `/web/crew-run/` navigation, then inspect the existing compatibility fallback. They verify routes, authored encounter effects, positioning data, board-save loading, once-only counting and relevant blocking/overflow/browser-error behavior. They do not replay live C.19 tactical battles, simulate balance, or replace the independently green C.19 bridge/mission acceptance suites. Existing local hub-shell request exemptions and aborted-navigation handling remain unchanged.

This is browser emulation of existing phone/desktop gates, not physical-device acceptance or approval of any new art.


## Fresh opening contract

After the owner-authorized removal of retired `op-*` illustration markup, the authored arrival uses a neutral bounded sheet above the retained map. While open, other campaign chrome is hidden; removing the modal restores it. Only the opening markup, isolated presentation rules, cache references and obsolete art expectation changed after the seven-gate batch.

The focused fresh suite passed **70/0**, exit 0, in 95.995 seconds. It retained the existing authored captions/audio/mute, skip by tap/button/key, automatic dismissal, save safety, Resume/`?skip`, Toko counter and reduced-motion checks. New checks cover all captions unscrolled at ≥12px, native ≥44px Skip, absence of retired art, combined visible UI within half the viewport including its bottom inset, retained map and chrome restoration at desktop 1280×800, phone 390×844 and landscape phone 844×390.

Actual browser PNGs were captured and inspected at all three sizes:

- [Desktop](arrival-captures/arrival-desktop.png)
- [Phone](arrival-captures/arrival-phone.png)
- [Landscape phone](arrival-captures/arrival-landscape-phone.png)

[opening-neutral-results.json](opening-neutral-results.json) contains the exact invocation/environment, source hashes and PNG hashes; [opening-neutral.cjs.log](opening-neutral.cjs.log) preserves complete stdout/stderr. All four source/test hashes remained unchanged during this focused run. Source HEAD was `50f6161b777cb4ed9f330ab5cb95e8888fd6e639` with the bounded opening patch supplied by the implementation agent.

```text
102785ea60de8b8bb1be94a1be4ef212b2800a06cb320dbef849f24ea430a613  web/v3.css
8a42072303bda9ac033934c961e0ae7d5d75e0f796dfb70a5ee5b089152bcb30  web/index.html
91e698bfe015c59d810c76ec07b4bbc47468ce7df9337dbc4ba90c6f6ad69c2a  web/js/v3/app.js
b61f7817c86f6f2d883f0eebd4d4ccf3517c2f4881c640139d5b4b9ca1bf5aa9  web/test/opening.cjs
```

The seven initial gate results were not rerun after this isolated opening change and remain tied to their earlier hashes. Neither report is physical-device acceptance or a new-art approval. No further blockers were observed in the requested local gate scope.
