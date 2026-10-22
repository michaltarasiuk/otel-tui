# AGENTS.md

## Comments

- Write a comment only to explain what the code cannot: a hidden constraint, a workaround, or surprising behavior.
- Don't restate what the code does. Fix unclear code with better names instead.
- Don't document default values or behavior that the signature and code already show.

## Callbacks

- Don't pass a function as a callback unless it was designed for it; wrap it in an arrow that forwards only the arguments you mean (`items.map((item) => format(item))`, not `items.map(format)`). If either side later gains a parameter, the extra arguments flow in silently and change behavior. See https://jakearchibald.com/2021/function-callback-risks/

## React naming

- Name a state updater's argument by the first letters of the state variable: `setSort((s) => nextSort(s))`, `setErrorsOnly((eo) => !eo)`. See https://react.dev/learn/queueing-a-series-of-state-updates#naming-conventions

## Null and undefined

- Use `undefined` for a missing value: optional fields, "not found" results, cleared state (`setSelectedKey(undefined)`, `Promise<Trace | undefined>`). Check it with `=== undefined`, not truthiness.
- Use `null` only where an API demands it: DuckDB columns, `useRef<Renderable>(null)` for element refs, and `null` to render nothing in JSX. Convert `null` to `undefined` at the boundary so it doesn't spread through the code. See https://github.com/sindresorhus/meta/discussions/7

## Commits

- Use Conventional Commits: `<type>: <subject>`, with types `feat`, `fix`, `refactor`, `test`, `docs`, or `chore`. No scope.
- Write the subject in lowercase imperative, without a trailing period, and say what changes for the reader (`feat: prune old telemetry from the in-memory database`).
- Add a body, wrapped at 72 columns, when the subject can't carry the why or the notable details. Skip it for self-explanatory changes.
- Keep each commit to one logical change; split unrelated edits into separate commits.
- Commit straight to `main`.
