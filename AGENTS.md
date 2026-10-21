# AGENTS.md

## Comments

- Write a comment only to explain what the code cannot: a hidden constraint, a workaround, or surprising behavior.
- Don't restate what the code does. Fix unclear code with better names instead.
- Don't document default values or behavior that the signature and code already show.

## Callbacks

- Don't pass a function as a callback unless it was designed for it; wrap it in an arrow that forwards only the arguments you mean (`items.map((item) => format(item))`, not `items.map(format)`). If either side later gains a parameter, the extra arguments flow in silently and change behavior. See https://jakearchibald.com/2021/function-callback-risks/.
