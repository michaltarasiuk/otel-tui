# AGENTS.md

## Changes

- When existing code makes a change awkward, fix the code instead of working around it, even outside the files the task names.
- Commit the refactor on its own, before the change it enables.

## Files

- Each signal (`services`, `traces`, `metrics`, `logs`) keeps its SQL, reads, queries, screens, and tests in one flat folder.
- Imports flow one way: `utils` → `telemetry`, `query`, `ui` → signals → `app`, `mcp`. A signal never imports another signal or `app`; `app` links the views.
- Keep code as close to its use as its kind allows: signal code in its signal's folder, generic helpers in `utils` or `ui` even with one caller. Move a file only when its place starts to hurt.

## Code

- Don't pass a function as a callback unless it was designed for it; forward only the arguments you mean (`items.map((item) => format(item))`). See https://jakearchibald.com/2021/function-callback-risks/.

## React

- A page file shows its screen top to bottom: page header, regions, `KeyHints`. Layout shells (`Split`, `PageHeader`, `DetailsHeader`, `Section`) only arrange `children`, without config props.
- Order a component body by data flow, as React's own code does: each value comes right after what it reads, hooks and plain values alike. A ref comes just before the effect or JSX that uses it.
- Custom hooks return `[value, set]` like `useState` and accept updaters.
- Key binding handlers go through `useEffectEvent`.
- Declare keys with `<Key name onPress>label</Key>` inside `KeyHints`; JSX order is hint order, JSX conditions decide when a key is active, and `FocusScope` disables a group.
- Keep hidden screens alive with `Screen` (`Activity`), not visibility flags. `Screen` mounts a page the first time it shows.
- Read data with `useSuspenseQuery`, or `useSuspenseQueries` for several queries in one component. One `Suspense` in `app.tsx` holds every screen, so a change that suspends keeps the previous screen; regions add no `Suspense` of their own. Each `Screen` wraps its page in an `ErrorBoundary` with `PageError`.
- Defer state that changes a query key: `useDeferredValue` for filters and navigation, `search.deferredText` for search, and `useDeferredValue(selected)` for the details of a selection. Key the details by the deferred value and put the region's `ErrorBoundary` inside it. Don't use `startTransition`: OpenTUI renders transitions eagerly and shows fallbacks.
- Name a deferred value like React does: `const deferredSort = useDeferredValue(sort)`. Queries and what describes their rows (table sort, details, "no match" text) read the deferred value; chips and keys read `sort`, so they respond at once.
- When a page needs a region's data for keys, it reads the same `queryOptions` with `useQuery`.

## Tests

- Test through the rendered app: press keys, read the screen by region with `#testing/screen.ts`, never by line index.
- Drive the app with `#testing/app.tsx`. Inject failures through `renderApp({ connection })`.
- Wait for a concrete frame, never for time. A screen stays up, keys included, until the next one loads, so after a key that navigates wait for something only the destination shows.
- Fake global state with `fakeClock`, `fakeTimers`, and `silenceConsoleError`. Restore spies with `using`.

## Commits

- Conventional Commits without scope: `feat`, `fix`, `refactor`, `test`, `docs`, or `chore`, e.g. `feat: prune old telemetry from the in-memory database`.
- Commit straight to `main`.
