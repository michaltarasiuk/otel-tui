---
name: react-composition
description: Design or rework React components, page composition, state, data loading, or key bindings in otel-tui. Walks from the screenshots to a JSX sketch, grounds each decision in React core team sources and the installed versions, then implements with screen-level tests.
---

# React composition

Use this when designing a screen, reshaping components, moving state, or changing how data loads. The conventions that came out of this process live in AGENTS.md under "React" and "Tests". Follow them; this skill is how to reach new decisions, not a second copy of the rules.

## 1. Start from the screen, not the code

1. Look at the screenshots in `docs/*.png` (or run the app) and draw the component tree top to bottom, one box per region on screen.
2. Write the JSX sketch for each page and region from that tree. A page file must read like the screen.
3. Only then open the current code and list where it diverges from the sketch.
4. Talk it through with the user before planning. Present the sketch, and name every place where existing behavior forces a deviation (key hints, navigation history, polling, tests). Don't silently "adjust" the sketch.

## 2. Ground each decision in React core team sources

Cite the source when you propose a pattern. Check, in this order:

- react.dev Learn: "Thinking in React", "Choosing the State Structure", "Sharing State Between Components" (controlled vs uncontrolled), "Preserving and Resetting State", "Passing Data Deeply with Context" (props and children first), "Reusing Logic with Custom Hooks", "Separating Events from Effects", "Removing Effect Dependencies", "You Might Not Need an Effect".
- react.dev Reference: `Suspense`, `Activity`, `useEffectEvent`, `useDeferredValue`, `startTransition`.
- `facebook/react` GitHub issues and PRs for the behavior you rely on, plus the changelog of the installed version.
- Posts and talks by React core team members (for example "Before You memo()").

## 3. Verify against what is installed

Docs describe the latest React. Before relying on a behavior, check `node_modules`: `react`, `react-reconciler`, `@opentui/react`, `@opentui/keymap`, `@tanstack/react-query`. Read the source when the docs are unclear.

Findings so far:

- A hidden `Activity` still pre-renders its children. Suspense queries inside would fetch, so data a page reads itself stays on `useQuery`.
- OpenTUI's reconciler implements `hideInstance`, so `Activity` works and stops effects (polling, key bindings) in hidden screens.
- After an `ErrorBoundary` catches a query error, call `useQueryErrorResetBoundary().reset`. Otherwise a remount by `key` rethrows the cached error instead of fetching.
- React keeps a shown Suspense fallback for about 300 ms. Fallbacks on interactions (arrowing through rows, typing) flicker.

Add new findings here when you find them.

## 4. Implement and verify

- Implement in steps that each pass `bun run check` and `bun test`.
- Test through the rendered app and read the screen by region (see AGENTS.md "Tests").
- Run the app (`bun run demo:up`) and compare against `docs/*.png` before calling the work done; the tests only read text.
