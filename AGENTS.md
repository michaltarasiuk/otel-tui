# AGENTS.md

## Changes

- When existing code makes a change awkward, fix the code instead of working around it, even outside the files the task names.
- Commit the refactor on its own, before the change it enables.

## Code

- Don't pass a function as a callback unless it was designed for it; forward only the arguments you mean (`items.map((item) => format(item))`). See https://jakearchibald.com/2021/function-callback-risks/.

## React

- A page file shows its screen top to bottom: page header, regions, `KeyHints`. Layout shells (`Split`, `PageHeader`, `DetailsHeader`, `Section`) only arrange `children`, without config props.
- Custom hooks return `[value, set]` like `useState` and accept updaters.
- Key binding handlers go through `useEffectEvent`.
- Declare keys with `<Key name onPress>label</Key>` inside `KeyHints`; JSX order is hint order, JSX conditions decide when a key is active, and `FocusScope` disables a group.
- Keep hidden screens alive with `Screen` (`Activity`), not visibility flags. `Screen` mounts a page the first time it shows.
- Read data with `useSuspenseQuery`, or `useSuspenseQueries` for several queries in one component. One `Suspense` in `app.tsx` holds every screen, so a change that suspends keeps the previous screen; regions add no `Suspense` of their own. Each `Screen` wraps its page in an `ErrorBoundary` with `PageError`.
- Defer state that changes a query key: `useDeferredState` for filters and navigation, `search.query` for search, and `useDeferredValue(selected)` for the details of a selection. Key the details by the deferred value and put the region's `ErrorBoundary` inside it. Don't use `startTransition`: OpenTUI renders transitions eagerly and shows fallbacks.
- When a page needs a region's data for keys, it reads the same `queryOptions` with `useQuery`.

## Tests

- Test through the rendered app: press keys, read the screen by region with `#testing/screen.ts`, never by line index.
- Drive the app with `#testing/app.tsx`. Inject failures through `renderApp({ connection })`.
- Wait for a concrete frame, never for time. A screen stays up, keys included, until the next one loads, so after a key that navigates wait for something only the destination shows.
- Fake global state with `fakeClock`, `fakeTimers`, and `silenceConsoleError`. Restore spies with `using`.

## Commits

- Conventional Commits without scope: `feat`, `fix`, `refactor`, `test`, `docs`, or `chore`, e.g. `feat: prune old telemetry from the in-memory database`.
- Commit straight to `main`.
