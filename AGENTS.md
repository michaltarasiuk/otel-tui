# AGENTS.md

## Changes

- When the existing code makes a change awkward, step back and fix the code instead of working around it. Rename, reshape, or move whatever is in the way, even if it sits outside the files the task names.
- Treat existing code as open to change. A workaround that leaves it untouched costs more over time than the refactor would.
- Commit the refactor on its own, before the change it makes possible.

## Comments

- Prefer a name that carries the reason over a comment: a named constant for a value, a named function for a step.
- Don't document default values or behavior that the signature and code already show.

## Callbacks

- Don't pass a function as a callback unless it was designed for it; wrap it in an arrow that forwards only the arguments you mean (`items.map((item) => format(item))`, not `items.map(format)`). If either side later gains a parameter, the extra arguments flow in silently and change behavior. See https://jakearchibald.com/2021/function-callback-risks/.

## Commits

- Use Conventional Commits: `<type>: <subject>`, with types `feat`, `fix`, `refactor`, `test`, `docs`, or `chore`. No scope.
- Write the subject in lowercase imperative, without a trailing period, and say what changes for the reader (`feat: prune old telemetry from the in-memory database`).
- Add a body, wrapped at 72 columns, when the subject can't carry the why or the notable details. Skip it for self-explanatory changes.
- Keep each commit to one logical change; split unrelated edits into separate commits.
- Commit straight to `main`.
