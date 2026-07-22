---
name: gh-run-pr-review
description: Dispatch and monitor the repository's GitHub Actions automated pull-request review workflow using the GitHub CLI. Use when the user asks to kick off, run, rerun, watch, or inspect automated Codex review for a PR, or requests GitHub Actions PR review after pushing branch changes.
---

# Run GitHub PR Review

Dispatch the repository's focused Codex review workflow for one open pull request, monitor the exact run, and report its conclusion and posted review comment.

## 1. Resolve and verify

1. Run `gh auth status` and stop if authentication is unavailable.
2. Resolve the requested PR explicitly. For the current branch, use `gh pr view --json number,state,baseRefName,headRefName,url`.
3. Require an open PR and record its number and actual base branch. Never assume `main` when the PR reports another base.
4. Inspect `gh workflow list --all` and the local workflow file. Prefer `.github/workflows/codex-pr-review.yml` when it supports `workflow_dispatch` inputs `pr_number` and `base_ref`.
5. Check recent runs of that workflow. Do not create a duplicate while a run for the same PR is queued or in progress unless the user explicitly requests a rerun.

## 2. Dispatch

Dispatch the workflow definition from its available branch while passing the PR's actual metadata:

```bash
gh workflow run codex-pr-review.yml --ref main \
  -f pr_number=<PR_NUMBER> \
  -f base_ref=<BASE_REF>
```

Use the repository default branch for `--ref` unless the workflow exists only on another ref. `--ref` selects the workflow definition; `base_ref` selects the comparison base used by the review.

Record the dispatch time. Query workflow-dispatch runs after that time and identify the newest run for the workflow. Verify its event, workflow name, head branch, and creation time before monitoring it.

## 3. Monitor and report

1. Use `gh run watch <RUN_ID> --exit-status` for the identified run.
2. On failure, inspect `gh run view <RUN_ID> --log-failed` and report the failing step and actionable cause.
3. On success, inspect `gh run view <RUN_ID>` and the PR's newest comments to capture the posted Codex findings or `No findings` result.
4. Report the PR URL, workflow run URL/id, conclusion, and concise review outcome.

Do not edit code, dismiss findings, merge the PR, or rerun a completed review unless the user requests that next action.
