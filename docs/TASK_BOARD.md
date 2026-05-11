# Task Board

Branch: `feature/network-transport-abstraction`

Use this file as the working board for the current branch. Keep tasks finite, testable, and tied to concrete validation steps. When the feature is complete, roll durable summaries into the long-lived docs and reset this file to a clean state.

## Active Tasks

- [ ] Rebase or merge current `origin/main` before final closeout; this branch is behind by the recently merged PRs.
  - Validation: rerun `npm run validate:network-smoothness`, `npm run validate:network-stability` or focused network gates after integration.

## Completed Tasks

- Tied branch scope to issue #34 Network Sluggishness.
  - Files: `game.js`, `src/bootstrap/networkSessionRuntime.js`, `src/bootstrap/networkRenderRuntime.js`, `src/net/projectilePrediction.js`, `src/net/clientSnapshotHelpers.js`, `src/bootstrap/debugRuntime.js`.
  - Validation: `npm run validate:network-controller`, `npm run validate:network-projectiles`.
- Added browser-level smoothness validation for multiplayer controller movement, peer-observed remote movement, and local projectile presentation latency.
  - Files: `server/validate-network-smoothness.js`, `package.json`, `server/run-validation-suite.js`, `server/validation/selectiveCloseoutPlan.js`, `server/validate-selective-closeout-plan.js`.
  - Validation: `npm run validate:network-smoothness`.
- Ran focused network stability validation after smoothness harness was added.
  - Validation: `npm run validate:network-controller`, `npm run validate:network-projectiles`, `npm run validate:network-smoothness`, `npm run validate:selective-closeout-plan`, `npm run validate:core`, `git diff --check`.

## Follow-Ups

- Update durable docs before final branch closeout.

## Validation Commands

- `npm run validate:network-controller`
- `npm run validate:network-projectiles`
- `npm run validate:network-smoothness`
- `npm run validate:selective-closeout-plan`
- `npm run validate:core`

## Validation Results

- PASS `npm run validate:network-controller`
- PASS `npm run validate:network-projectiles`
- PASS `npm run validate:network-smoothness`
  - Controller: 85 frames, 161.3px travelled, frame p95 17.5ms, movement step p95 2.94px, max correction 2.99px.
  - Peer remote view: 97 frames, 269.4px travelled, frame p95 17.3ms, movement step p95 8.91px.
  - Projectile: local visibility latency 29.8ms.
- PASS `npm run validate:selective-closeout-plan`
- PASS `npm run validate:core`
- PASS `git diff --check`
