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
- Keep hidden screens alive with `Screen` (`Activity`), not visibility flags.
- Use Suspense + `ErrorBoundary` only for data a single region owns. A page reads its own list with `useQuery`.

## Tests

- Test through the rendered app: press keys, read the screen by region with `#testing/screen.ts`, never by line index.
- Drive the app with `#testing/app.tsx`. Inject failures through `renderApp({ connection })`.
- Wait for a concrete frame, never for time.
- Fake global state with `fakeClock`, `fakeTimers`, and `silenceConsoleError`. Restore spies with `using`.

## Commits

- Conventional Commits without scope: `feat`, `fix`, `refactor`, `test`, `docs`, or `chore`, e.g. `feat: prune old telemetry from the in-memory database`.
- Commit straight to `main`.
