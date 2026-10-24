# TypeSpeed

A typing trainer that runs in the browser. Three files, no framework, no build step.

Live: https://tmhsdigital.github.io/Typing-Game/

## Run it

Open `index.html` in a browser, or serve the folder with any static file server. The only network request is for two Google Fonts; without them the page falls back to system fonts.

## What it does

- **Time mode**: type for 15, 30, or 60 seconds. When you finish a passage a new one loads until the clock runs out.
- **Words mode**: type a fixed 10, 25, or 50 words. The clock counts up.
- **Categories**: General and Technology quotes, or Code Snippets (a mix of JavaScript, CSS, SQL, and shell lines).
- **Stats**: WPM, accuracy, mistakes, and your best WPM for the current settings, updated as you type.
  - WPM is correct characters divided by five, per minute of real elapsed time.
  - Accuracy is the share of typed characters that matched, counting mistakes you later fixed.
- **Hard Mode**: blurs the text you are typing.
- **Ghost Mode**: records the timing of your best run and replays its position as a second cursor while you type.
- **Results**: a modal with your WPM and accuracy, a line chart of your last ten runs at the current settings once you have two or more, and a button that copies a one-line summary to the clipboard.
- **Sound**: short tones made with the Web Audio API for keypress, mistake, and completion. Can be turned off.
- **Keyboard**: Tab restarts while you are typing. Escape closes a dialog.

Pasting into the input is blocked.

## Settings and data

Everything is stored in `localStorage` under these keys:

| Key                  | Contents                                                                     |
| -------------------- | ---------------------------------------------------------------------------- |
| `typingGameSettings` | mode, duration, word count, category, and the three toggles                  |
| `typingGameHistory`  | last 50 runs as `{wpm, accuracy, date, mode, key}`                           |
| `typingGameBests`    | best WPM and its keystroke timings for each settings key, used by Ghost Mode |

A settings key combines mode, length, and category, for example `time:60s:general` or `words:25w:code`. Best scores, Ghost Mode, and the chart only compare runs with the same key. Runs that finish in under a second are shown but not saved.

## Development

```
npm install
npx playwright install chromium   # once, for the tests

npm run serve         # static server on http://127.0.0.1:8765, no caching
npm test              # Playwright end-to-end tests in headless Chromium
npm run lint          # ESLint
npm run format:check  # Prettier
npm run format        # Prettier, write mode
npm run check         # lint, format check, and tests
```

`index.html`, `script.js`, and `style.css` are the whole app. The script runs at load and expects to be the last tag in `<body>`. Tests live in `tests/` and drive the real page with keystrokes; they cover time and words mode, WPM and accuracy math, the dialogs' keyboard handling, paste blocking, clipboard sharing, Ghost Mode replay, and recovery from corrupt `localStorage`.

Deployed with GitHub Pages from the `main` branch.

## License

Apache 2.0. See `LICENSE`.
