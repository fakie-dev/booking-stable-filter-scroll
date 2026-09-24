# Development

## Requirements

- Node.js 26 (the current major release when this setup was added)
- npm, included with Node.js
- A userscript manager such as Tampermonkey or Violentmonkey

Install dependencies with `npm ci`. The committed `package-lock.json` pins the toolchain for reproducible installs.

## Build and verify

```sh
npm ci
npm run build
npm run check
npm test
npm run test:browser
```

`npm run build` creates a single userscript and a metadata file in `dist/`, then updates their committed copies in the repository root. Edit `src/` rather than the generated root files. The production build is deliberately not minified so the published code can be reviewed and accepted by Greasy Fork. The final script has no `@require`, `@connect`, runtime packages, or telemetry.

Before committing, inspect the generated root files. CI repeats the build and fails if it changes the committed files. A release tag must match the version in `package.json`; the release workflow attaches the validated root artifacts.

Use the [quality gates](quality.md) to record what was verified for a change.
`npm run test:browser` rebuilds the userscript and runs a small local fixture in
headless Chrome or Chromium. It needs a browser executable; set `CHROME_PATH`
if Chrome is not in a standard location or on `PATH`. The fixture checks the
built script's scroll interception, manual-scroll release, and anchor
correction. It is an optional local check because CI does not install a browser.
Automated checks do not replace a live Booking.com check for selector or scroll
behavior changes.

To change the version in the package, lockfile, and generated metadata together:

```sh
node scripts/set-version.mjs 1.1.3
```

Update `CHANGELOG.md` when preparing a release. Do not create a tag until the intended version is ready to publish.

## Browser debugging

Run `npm run dev` and open the local address printed by Vite (normally `http://127.0.0.1:5173/`) in a browser with a userscript manager. Follow the install link on that page. Install its development script separately from the released script; the development entry uses a distinct name. Open a Booking.com search results page, then use browser DevTools to set breakpoints and inspect console output. Changes to `src/` can be served during development, and the final behavior should be checked once more with `npm run build` and the built script.

The development server binds to `127.0.0.1` and does not expose itself to the network. Some Booking pages may block the Vite development module under their Content Security Policy. If that happens, use the production build for browser testing or use Tampermonkey's local-file editing workflow in a separate development script. Keep local `@require` entries out of release metadata.

For a scroll regression, record the browser, userscript manager, Booking URL pattern, action, and a short screen capture. Check rapid consecutive clicks, a filter promoted into Popular filters, a full navigation, and manual wheel/key/touch scrolling.

## Private development and public releases

The maintainer develops in one local worktree with a private default remote.
Published changes are selected on a fresh branch based on `public/main`,
validated, and pushed separately. A public branch and its complete history are
visible to everyone. Ignore rules cannot remove previously tracked files.
The detailed maintainer procedure and local push guard live only in the private
repository; public contributors can use this repository normally.
