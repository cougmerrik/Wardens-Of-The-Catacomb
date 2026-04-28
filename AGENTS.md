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
- Run `npm run validate:core` for quick syntax and LOC checks.
- Run feature-specific validators when touching gameplay, networking, rendering, or validation harnesses.
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

## Code Review

- Use `codex review --base main` for local branch review.
- Use `codex review --uncommitted` for unstaged or staged local changes.
- Prioritize bugs, regressions, missing tests, and staging risks over style-only comments.
