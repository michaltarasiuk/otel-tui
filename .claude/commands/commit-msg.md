---
description: Draft a commit message for the staged changes
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*)
---

Staged changes:
!`git diff --staged`

Recent commits for style:
!`git log --oneline -10`

Write a commit message for the staged changes, following the Commits rules in AGENTS.md.
If the changes are more than one logical change, say so and propose a split.
Print the message only. Don't stage, commit, or add a co-author trailer.
