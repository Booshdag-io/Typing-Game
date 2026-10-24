# TypeSpeed

A typing trainer that runs in the browser. Plain HTML, CSS, and JavaScript, no framework, no build step.

Live: https://tmhsdigital.github.io/Typing-Game/

## Run it

Open `index.html` in a browser, or serve the folder with any static file server. The page makes no requests to other sites. The two fonts, JetBrains Mono and Space Grotesk, are served from `fonts/` under the SIL Open Font License, and a Content-Security-Policy limits scripts, styles, and fonts to the site itself.

## What it does

- **Mode and length**: picked from the bar above the text or in Settings. Changing them starts a new run.
- **Time mode**: type for 15, 30, or 60 seconds. When you finish a passage a new one loads until the clock runs out.
- **Words mode**: type a fixed 10, 25, or 50 words. The clock counts up.
- **Categories**:
  - Common Words (the default): 200 frequent English words in random order, never the same word twice in a row. Settings can add punctuation (capitalized sentences, commas, full stops) and numbers.
  - Weak Keys: common words that contain the three letters you miss most often, by miss rate, among letters you have typed at least five times. Until there is enough data it uses all common words.
  - Quotes: 50 passages, most of them opening lines of public-domain books.
  - Technology: 50 quotes about programming and computing.
  - Code Snippets: a mix of JavaScript, CSS, SQL, and shell lines.

  When the source of a passage is known, the result dialog shows it. Passages are in `texts.js`.

- **Stats**: WPM, accuracy, mistakes, and your best WPM for the current settings, updated as you type.
  - WPM is correct characters divided by five, per minute of real elapsed time.
  - Accuracy is the share of typed characters that matched, counting mistakes you later fixed. It is rounded down, so 100% means no mistakes.
- **Stop on error**: with this setting on, a wrong key is counted as a mistake but does not move the caret, so each mistake has to be fixed with the right key before you can continue.
- **Caps Lock warning**: a notice below the text while Caps Lock is on.
- **Hard Mode**: blurs the characters you have already typed, so you cannot see your mistakes. The text ahead stays readable.
- **Ghost Mode**: records the timing of your best run and replays its position as a second cursor while you type. Bests record the seed their passages were drawn from, so with Ghost Mode on you type the same passages as your best run. A line below the text shows how many characters ahead of or behind the ghost you are, or says that no ghost exists yet for the current settings.
- **Results**: a modal with your WPM and accuracy; raw WPM (all typed characters, right or wrong); correct and wrong character counts; elapsed time; whether the run set a new best for its settings, and the previous best; the keys you missed most in this run; a line chart of WPM at the end of each second of the run; a line chart of your last ten runs at the current settings once you have two or more; a Share button; and, once you have missed letters often enough, a button that starts a Weak Keys run. The shared text has the WPM, accuracy, settings, and a link to the site. On touch devices it opens the system share sheet; elsewhere it copies to the clipboard.
- **Challenge links**: after a run of a second or longer, Copy challenge link puts a URL on the clipboard. The URL's hash holds the run's settings, the seed of its passages, its WPM, and its keystroke timings, compressed. Opening it starts a run on the same passages with that run as the ghost, and the result dialog says who was faster. The receiver's saved settings are not changed; after the run, Play Again goes back to them. Links made before a change to the passages in `texts.js` may show different text.
- **Stats**: a dialog, opened from the chart icon in the header, with your best WPM for every setting you have played, the average of your last ten runs, and a list of recorded runs. Export saves everything in `localStorage` to a JSON file, Import loads such a file and replaces the stored data, and Clear data (two clicks) removes history, bests, and key stats.
- **Sound**: short tones made with the Web Audio API for keypress, mistake, and completion. Can be turned off.
- **Keyboard**: Tab restarts while you are typing. Escape closes a dialog. Opening Settings during a run abandons the run.
- **Focus**: if the typing input loses focus, a hint appears over the text. Pressing a letter key moves focus back to the input.
- **Screen readers**: the passage is available as the input's description, settings buttons report whether they are selected, and the result dialog reads out WPM and accuracy.
- **Reduced motion**: with the OS reduce-motion setting on, the background pulse, caret blink, and fades are turned off.

Pasting into the input is blocked, and the caret stays at the end: arrow keys, Home, End, select-all, and clicks do not move it.

## Settings and data

Everything is stored in `localStorage` under these keys:

| Key                  | Contents                                                                     |
| -------------------- | ---------------------------------------------------------------------------- |
| `typingGameSettings` | mode, duration, word count, category, and the feature toggles                |
| `typingGameHistory`  | last 500 runs as `{wpm, accuracy, date, mode, key}`                          |
| `typingGameBests`    | best WPM and its keystroke timings for each settings key, used by Ghost Mode |
| `typingGameKeyStats` | attempts and misses for each expected character across recorded runs         |

A settings key combines mode, length, and category, for example `time:60s:common` or `words:25w:code`. Common Words with punctuation or numbers adds them to the category, as in `time:30s:common+punctuation+numbers`. Best scores, Ghost Mode, and the chart only compare runs with the same key. Runs that finish in under a second are shown but not saved.

## Development

```
npm install
npx playwright install chromium firefox webkit   # once, for the tests

npm run serve         # static server on http://127.0.0.1:8765, no caching
npm test              # Playwright end-to-end tests in Chromium, Firefox, and WebKit
npm run lint          # ESLint
npm run format:check  # Prettier
npm run format        # Prettier, write mode
npm run check         # lint, format check, and tests
```

`index.html`, `texts.js`, `script.js`, and `style.css` are the whole app. The script runs at load and expects to be the last tag in `<body>`. Tests live in `tests/` and drive the real page with keystrokes in Chromium, Firefox, and WebKit. Each item under "What it does" has at least one test, as do recovery from corrupt `localStorage`, the contrast check, and the absence of requests to other sites.

Each push to `main` runs lint, the format check, and the tests in GitHub Actions. If they pass, the same workflow publishes `index.html`, `texts.js`, `script.js`, `style.css`, and `fonts/` to GitHub Pages; if they fail, the live site is not changed.

## License

Apache 2.0. See `LICENSE`.
