# Repository Agent Guide

## Scope

These instructions apply to the whole repository.

## Default Workflow

- Keep feature work on a branch and avoid committing unless the user explicitly asks.
- Before making broad changes, inspect the relevant source, docs, validation scripts, and current `git status`.
- Keep edits scoped to the requested feature or fix. Do not revert unrelated user or collaborator changes.
- Prefer small, testable implementation steps over large refactors.
- Use existing project patterns, helpers, and validation scripts before introducing new structure.

## Caveman Skill

- Use the `caveman` skill when the user explicitly asks for caveman mode, terse output, minimal tokens, command-only help, compact implementation plans, short debugging steps, commit messages, or concise code-review findings.
- Do not use it for teaching, onboarding, architecture tradeoff analysis, polished PR descriptions, or user-facing docs that need full prose.
- When active, keep commentary short:
  - state the action
  - name files or commands
  - skip filler
  - mention only material risks or blockers
- Prefer bullets, exact commands, file paths, and validation results.
- Ask at most one question, only when blocked.
- Do not carry caveman mode across turns unless the user re-requests it or the next request clearly asks for terse terminal/coding guidance.

## Feature Planning

- Use `docs/TASK_BOARD.md` for active branch tasks when work needs more than a trivial change.
- Keep tasks finite, testable, and tied to concrete files or behavior.
- Each task should include at least one validation command or unit-style check required for completion.
- Keep task descriptions implementation-oriented enough that they can be executed independently.
- Move completed task summaries into the `Completed Tasks` section while work is active.

## Persistent Documentation

- Treat `docs/TASK_BOARD.md` as temporary branch state, not durable documentation.
- When a feature is complete, roll durable summaries into long-lived docs such as:
  - `docs/GAMEPLAY_SYSTEMS.md` for gameplay rules and player-facing mechanics.
  - `docs/TECHNICAL_OVERVIEW.md` for architecture, data flow, rendering, networking, and validation notes.
  - Feature-specific design docs when the change belongs to an existing topic document.
- After durable docs are updated, reset `docs/TASK_BOARD.md` to its clean default state:
  - no active tasks
  - no completed tasks
  - no follow-ups unless explicitly requested
  - no stale validation results
- Do not leave temporary planning files in the final staged set unless the user asks to keep them.

## Validation

- Prefer focused validation first, then broader validation before staging or commit.
- Run `npm run validate:core` for quick syntax and maintainability diagnostics. LOC reporting is advisory and must not block a change or motivate meaningless file splits.
- Split modules by cohesive responsibility, ownership, and testability rather than an arbitrary line count. Prefer targeted search and partial file reads to control agent context consumption.
- All project code may be agent-generated, but it must remain readable, understandable, maintainable, and covered by behavior-focused validation. Generated provenance is not an exception to normal code-quality expectations.
- Run feature-specific validators when touching gameplay, networking, rendering, or validation harnesses.
- Prefer behavior assertions over source-text wiring assertions for state machines, input blocking/draining, queue lifecycles, cleanup retries, local/network parity, and other regressions that depend on order or time.
- Use source-text wiring assertions only as supplements when a runtime validator cannot cover the integration seam cheaply.
- When adding or changing gameplay statuses, progression effects, floating text, damage indicators, summons, class procs, or other player-visible combat feedback, update targeted validation so local and multiplayer presentation remain in sync.
- Add or update unit-style validation when behavior changes. If a suitable test does not exist, create the smallest appropriate validator.
- Rerun failed validations after fixes. If a test appears flaky, improve the logging or assertions before treating it as flaky.
- Run `node server/run-validation-suite.js closeout` before staging large branch work or preparing a PR.
- Use `git diff --check` or `git diff --cached --check` before final handoff.

## Regression Closeout

- Before preparing files for staging, run the full relevant regression suite for the branch.
- If the full regression suite is expensive, use focused validators during implementation and reserve full closeout validation for the end.
- When full regression fails, isolate with the smallest relevant validator before rerunning the full suite.
- Include validation results in the final handoff or commit preparation summary.

## Staging Files

- Only stage files after the user explicitly asks.
- Review `git status --short` and `git diff --stat` before staging.
- Stage source, tests, and durable docs that are relevant to the requested change.
- Do not stage generated artifacts from `artifacts/` unless the user explicitly requests them.
- Do not stage unrelated local changes, temporary files, or planning files that should not persist.
- After staging, run `git diff --cached --check` and summarize the staged file set.

## Commit And Push Prep

- Do not commit unless the user explicitly asks.
- Before committing, confirm:
  - task board is clean or intentionally staged
  - durable docs are updated
  - relevant focused validations pass
  - full regression or closeout validation has been run when appropriate
  - generated artifacts are excluded unless requested
- Use concise commit messages that describe the completed feature or fix.
- Do not push unless the user explicitly asks.
- Before pushing, confirm the current branch, upstream target, and latest status.
- Prefer pushing the current feature branch to its matching remote branch.
- Provide a short PR-ready summary after push prep when useful.

## Gameplay And Rendering Notes

- Keep lighting mechanics centralized in `src/game/world/lighting.js`.
- Keep rendering overlay behavior in `src/rendering/runtimeSceneLightingMethods.js`.
- Keep lantern fuel bounded in the `0..1` range and synchronized through network state.
- Keep gameplay state changes separate from renderer-only presentation when feasible.
- Keep networked gameplay state serializable and validated when adding mechanics that affect multiplayer.
- Keep local and multiplayer presentation parity for gameplay feedback. Status icons, floating text, damage/kill indicators, progression notifications, and class-effect notifications should share behavior unless a local-only exception is intentional and documented.
- Treat `docs/ENVIRONMENT_ART_PIPELINE.md` as the source of truth for Blender-authored environment art, including modular dimensions, polygon budgets, flat-shading rules, camera, lighting, palette, render resolution, filtering, and animation standards.
- Treat `docs/BLENDER_SPRITE_PIPELINE.md` as the source of truth for Blender-to-Aseprite character sprites, including rig structure, action frame counts, directional capture, pivots, palette cleanup, sheet layout, and runtime integration gates.
- Use the repository-local `blender-mcp` skill for general Blender MCP safety, inspection, authoring, and validation so every collaborator follows the same base workflow.
- Use the repository-local `wardens-blender-environment-art` skill for Blender MCP work on Wardens environment assets. Apply its specification before generation and report its validation checklist before saving or exporting.
- Use the repository-local `wardens-blender-sprite-art` skill for low-poly character modeling, rigging, directional animation renders, sprite-sheet generation, and Aseprite cleanup for Wardens.
- Keep Blender experiments non-destructive: inspect the scene first, create named asset collections, preserve exact modular seams, and do not overwrite `.blend` sources or exports without confirmation.

## Code Review

- Use `codex review --uncommitted` while a risky local diff is still cheap to revise.
- Use `codex review --base main` before pushing broad branch work or requesting GitHub PR review.
- Batch local review findings, fixes, and focused validation before rerunning remote PR review. Do not use GitHub Action review as an iterative per-fix defect finder unless the user explicitly asks.
- Reserve manual GitHub Action PR review for closeout after local review and relevant validation have covered the changed behavior.
- Prioritize bugs, regressions, missing tests, and staging risks over style-only comments.
