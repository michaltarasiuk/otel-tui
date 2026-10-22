# AGENTS.md

## Comments

- Write a comment only to explain what the code cannot: a hidden constraint, a workaround, or surprising behavior.
- Don't restate what the code does. Fix unclear code with better names instead.
- Prefer a named constant that carries the reason over a comment explaining a value.
- Don't document default values or behavior that the signature and code already show.

## Callbacks

- Don't pass a function as a callback unless it was designed for it; wrap it in an arrow that forwards only the arguments you mean (`items.map((item) => format(item))`, not `items.map(format)`). If either side later gains a parameter, the extra arguments flow in silently and change behavior. See https://jakearchibald.com/2021/function-callback-risks/.

## Commits

- Use Conventional Commits: `<type>: <subject>`, with types `feat`, `fix`, `refactor`, `test`, `docs`, or `chore`. No scope.
- Write the subject in lowercase imperative, without a trailing period, and say what changes for the reader (`feat: prune old telemetry from the in-memory database`).
- Add a body, wrapped at 72 columns, when the subject can't carry the why or the notable details. Skip it for self-explanatory changes.
- Keep each commit to one logical change; split unrelated edits into separate commits.
- Commit straight to `main`.
