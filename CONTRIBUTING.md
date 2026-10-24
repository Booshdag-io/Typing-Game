# Contributing

TypeSpeed is plain HTML, CSS, and JavaScript with no build step. The files in the repo root are the site; GitHub Pages publishes them from `main` after CI passes.

## Setup

```
npm install
npx playwright install chromium firefox webkit
npm run serve    # http://127.0.0.1:8765, caching off
```

## Before you push

`npm run check` runs ESLint, the Prettier check, and the Playwright tests in Chromium, Firefox, and WebKit. It must pass. CI runs the same steps on every push and pull request.

Every bug fix needs a test in `tests/` that fails without the fix. Tests drive the real page with keystrokes. Use `page.clock` for anything that depends on elapsed time instead of waiting.

## Code style

- 4-space indentation, single quotes, semicolons, lines up to 100 characters. `npm run format` applies this.
- `script.js` is a classic script, not a module. Group code under `// --- Section ---` banner comments.
- DOM references are module-level consts at the top of `script.js`. A new element in `index.html` needs one there.
- Settings live in `gameState` (saved) and per-run data in `runtime` (reset by `resetGame`).
- Put passage text on the page with `textContent`, never `innerHTML`.
- Colors go through the custom properties in `style.css` so every theme can override them. Do not write `transition: all`.
- Passages, word lists, and code snippets are in `texts.js`. Give a quote a `source` only when you can confirm the attribution.

## Docs

README and comments say what the code does. No claims about quality or speed, and no features that are not in the code.

## Commits

Sentence-style imperative subjects, for example "Add settings modal" or "Fix hidden modals".
