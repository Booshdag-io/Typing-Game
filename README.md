# TypeSpeed

A typing trainer that runs in the browser. Three files, no framework, no build step.

Live: https://tmhsdigital.github.io/Typing-Game/

## Run it

Open `index.html` in a browser, or serve the folder with any static file server. The only network request is for two Google Fonts; without them the page falls back to system fonts.

## What it does

- **Time mode**: type for 15, 30, or 60 seconds. When you finish a passage a new one loads until the clock runs out.
- **Words mode**: type a fixed 10, 25, or 50 words. The clock counts up.
- **Categories**: General and Technology quotes, or Code Snippets (a mix of JavaScript, CSS, SQL, and shell lines).
- **Stats**: WPM, accuracy, mistakes, and your best WPM, updated as you type.
  - WPM is correct characters divided by five, per minute of real elapsed time.
  - Accuracy is the share of typed characters that matched, counting mistakes you later fixed.
- **Hard Mode**: blurs the text you are typing.
- **Ghost Mode**: records the timing of your best run and replays its position as a second cursor while you type.
- **Results**: a modal with your WPM and accuracy, a line chart of your last ten runs once you have two or more, and a button that copies a one-line summary to the clipboard.
- **Sound**: short tones made with the Web Audio API for keypress, mistake, and completion. Can be turned off.
- **Keyboard**: Tab restarts while you are typing. Escape closes a dialog.

Pasting into the input is blocked.

## Settings and data

Everything is stored in `localStorage` under these keys:

| Key                   | Contents                                                    |
| --------------------- | ----------------------------------------------------------- |
| `typingGameSettings`  | mode, duration, word count, category, and the three toggles |
| `typingGameHistory`   | last 10 runs as `{wpm, accuracy, date, mode}`               |
| `typingGameHighScore` | best WPM across all modes                                   |
| `typingGameBestRun`   | keystroke timings of the best run, used by Ghost Mode       |

The best score and ghost run are shared across modes and categories, so a 10-word run and a 60-second run compete for the same number.

## Development

```
npm install
npm run lint          # ESLint on script.js
npm run format:check  # Prettier on the top-level files
npm run format        # Prettier, write mode
npm run check         # both
```

`index.html`, `script.js`, and `style.css` are the whole app. The script runs at load and expects to be the last tag in `<body>`.

Deployed with GitHub Pages from the `main` branch. There are no tests.

## License

Apache 2.0. See `LICENSE`.
