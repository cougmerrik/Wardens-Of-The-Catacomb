---
name: prepare-branch-closeout
description: Prepare a Wardens feature or fix branch for staging, commit, PR, or push by auditing the working tree, rolling completed task-board work into persistent documentation, cleaning temporary branch state, selecting focused and regression validation from touched files and behavior, reviewing failures and generated artifacts, and reporting a push-ready inventory. Use when the user asks to clean up, close out, finalize, stage, commit, prepare a PR, or prepare local branch files for pushing.
---

# Prepare Branch Closeout

Turn finished branch work into a reviewed, documented, validated file set. Follow repository `AGENTS.md`; this skill adds a repeatable execution order.

## 1. Establish scope

1. Read `AGENTS.md` and `docs/TASK_BOARD.md`.
2. Inspect `git status --short --branch`, `git diff --stat`, and relevant diffs.
3. Identify the branch objective, touched subsystems, generated assets, temporary outputs, and unrelated changes.
4. Preserve unrelated changes. Do not stage, commit, push, delete, or overwrite without user authorization.

## 2. Close temporary task state

1. Confirm every active task is complete or report what remains.
2. Move durable outcomes from the task board into long-lived documents:
   - gameplay rules and player-visible behavior → `docs/GAMEPLAY_SYSTEMS.md`
   - architecture, data flow, rendering, networking, and validation → `docs/TECHNICAL_OVERVIEW.md`
   - established feature or pipeline behavior → its feature-specific document
3. Preserve repeatable failure modes, tool limitations, validation gates, and workflow improvements in relevant skills or pipeline docs.
4. Remove stale claims superseded by the final implementation.
5. Reset `docs/TASK_BOARD.md` to the clean branch template with no tasks, follow-ups, commands, or results.

## 3. Select validation from risk

Build validation from changed files and changed behavior. Do not rely only on filenames.

1. Find existing validators and package scripts with `rg` before inventing tests.
2. Run the smallest behavior-focused validator for each changed contract first.
3. Include local/network parity checks for serialized gameplay or visible feedback.
4. Include browser/runtime checks for loaders, rendering, assets, async fallback, input, timing, or presentation.
5. Add or update the smallest unit-style validator when existing coverage cannot assert the changed behavior.
6. Run `npm run validate:core` after focused checks.
7. Choose regression breadth proportionally:
   - Default branch closeout: run focused validators for each touched contract, its direct integration seams, `npm run validate:core`, and diff hygiene.
   - Add multiplayer/browser gates only when the changed behavior crosses those boundaries.
   - Run `node server/run-validation-suite.js closeout` only when the diff changes shared or cross-cutting infrastructure, spans several unrelated subsystems, lacks adequate focused coverage, has a high regression blast radius, or the user explicitly requests the full suite.
   - Preparing to push does not by itself justify every project regression gate.
8. Isolate a failed gate, fix or diagnose it, and rerun it. Do not call it flaky without a successful focused rerun and evidence it is unrelated.
9. Run `git diff --check` last. Run `git diff --cached --check` after staging.

Typical mappings:

- `src/game/**` → feature validator plus applicable tactics, combat, or progression checks
- `server/net/**` or client sync → serialization, local/network parity, and relevant multiplayer browser checks
- `src/rendering/**` or runtime assets → feature validator plus a real browser loader/render check
- Blender/Aseprite assets or art tools → asset coverage, dimensions, palette, source-open, sheets, and runtime-loader checks
- validation harness changes → the changed validator and its containing suite
- documentation or skill-only changes → structural validation, referenced-command verification, and diff hygiene

Treat LOC output as advisory. Do not create meaningless splits.

Before running a broad suite, state why focused coverage is insufficient and name the additional risk it covers.

## 4. Review and clean

1. Run `codex review --uncommitted` for risky or broad diffs while findings are cheap to fix.
2. Resolve correctness, regression, test, and ownership findings; rerun focused validation.
3. Inspect ignored and untracked files. Keep canonical sources, reproducible tools, runtime assets, tests, and durable docs. Exclude disposable renders, caches, logs, screenshots, and validation artifacts unless requested.
4. Resolve exact targets before deleting material files and obtain approval unless deletion is already authorized. Report what was removed and whether it is reproducible or recoverable.

## 5. Prepare the handoff

Report:

- branch and objective;
- durable docs and workflow lessons updated;
- temporary state and artifacts cleaned;
- focused and broad validation results, including reruns;
- review findings and resolutions;
- remaining risks or manual checks;
- exact staged and unstaged state.

Only stage after explicit instruction. Review status and diff stats first; stage only relevant source, tests, assets, and durable docs. Never stage `artifacts/` by default. Only commit or push after explicit instruction, and confirm branch and upstream before pushing.
