# Security

## Reporting a problem

Report security problems privately: open the repository's **Security** tab and click **Report a vulnerability**. Please do not open a public issue for them.

There is no bug bounty.

## Scope

TypeSpeed is static files with no backend. These parts handle input from outside the page and are in scope:

- The published site at https://tmhsdigital.github.io/Typing-Game/, including the Content-Security-Policy in `index.html`.
- Challenge links: the URL hash is decoded and validated by `decodeChallenge` and `parseChallenge` in `script.js`.
- Import in the Stats dialog: the JSON file is validated by `importData` and the `valid*` functions in `script.js`.
- Values read back from `localStorage`.
- The service worker, `sw.js`, and what it caches.

Dev tooling in `package.json` (ESLint, Prettier, Playwright) does not run on the site. Dependabot opens updates for it.
