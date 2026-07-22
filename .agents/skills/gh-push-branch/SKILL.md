---
name: gh-push-branch
description: Safely push a validated local Git branch to its matching GitHub remote branch, establish or verify upstream tracking, reject accidental target mismatches and force pushes, and confirm local/remote commit parity. Use when the user asks to push, publish, update a PR branch, send committed changes to GitHub, or continue a skill-based closeout workflow after local commits.
---

# Push Git Branch

Push committed branch work without changing branch history or silently targeting another branch.

## 1. Verify authorization and state

1. Require an explicit user request to push or publish the branch. Invoking this skill counts as that request when pushing is the stated workflow objective.
2. Run `git status --short --branch`, `git branch --show-current`, `git remote -v`, and `git log -1 --oneline`.
3. Stop if the current ref is detached, the working tree contains unexpected changes, a merge/rebase is active, or the requested remote/branch is ambiguous.
4. Determine the upstream with `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`. If none exists, default to `origin/<current-branch>` and state that mapping before pushing.
5. Fetch the target remote when divergence is uncertain. Never force-push, delete a remote branch, or push to a differently named branch unless the user explicitly requests it.

## 2. Push

- Existing matching upstream: `git push`.
- No upstream: `git push -u origin <current-branch>`.
- If the remote is ahead or histories diverge, stop and report the state. Do not resolve it automatically with force or destructive history changes.

## 3. Verify

1. Run `git status --short --branch`.
2. Compare `git rev-parse HEAD` with `git rev-parse @{upstream}`.
3. Report the branch, remote target, pushed commit, parity result, and any remaining local changes.
4. If an open PR exists, report its URL and whether the pushed branch is its head.

Do not create, edit, merge, or review a PR unless another invoked skill authorizes that action.
