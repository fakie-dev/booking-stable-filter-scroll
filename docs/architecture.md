# Architecture

The project is a browser userscript. Node.js runs the development tools; it is not part of the installed script. Vite and `vite-plugin-monkey` bundle the source into one readable, self-contained `.user.js` and generate the matching `.meta.js`. The two files in the repository root are committed release artifacts because the direct install and update URLs point there.

## Boundaries

| Path | Responsibility |
| --- | --- |
| `src/main.js` | Browser lifecycle, user input, scroll interception, temporary storage, and the stabilization loop. |
| `src/anchors.js` | Discover visible filter rows, match rows after DOM changes, and calculate a robust scroll correction. |
| `src/metadata.js` | Userscript scope, permissions, localization, and update URLs. The version comes from `package.json`. |
| `vite.config.js` | Development server and production userscript build. |
| `scripts/validate.mjs` | Checks release metadata and project invariants. |
| `scripts/sync-build.mjs` | Copies both generated files from `dist/` into the repository root. |
| `tests/` | Node tests for anchor matching and the browser lifecycle. |
| `scripts/browser-smoke.mjs` | Runs the built userscript in a small headless Chromium fixture. |

`src/main.js` is the only runtime entry point. Other modules are bundled into its closure; the installed script does not make network requests or load code from a CDN. Keep browser permissions explicit in metadata and avoid runtime dependencies until a feature actually needs one.

## Current behavior

The script runs on Booking.com search results at `document-start`. A captured `pointerdown` on `[data-filters-item]` records the current page position and up to six visible neighboring rows. It excludes the clicked row because Booking may move that row. The row key and its former document position distinguish duplicate rows when a selected filter moves into “Popular filters.”

For a short stabilization window, an active-only `MutationObserver` tracks when the page changes, and one animation-frame loop compares those anchors with the current DOM. Each correction scans the filter rows once and measures each matched row once. The correction is the median movement after rejecting large outliers; a lone row that moved to another document position or two rows with conflicting movement cannot trigger a correction. Native scroll anchoring and competing programmatic scrolls are suppressed during that window. A wheel, touch, or scroll key stops the stabilization immediately, without one final correction, so manual input wins.

When a click causes a full navigation, the anchor snapshot is stored briefly in the current tab's `sessionStorage`. The next page attempts to restore the anchors or the old page position. The old-position fallback and temporary `history.scrollRestoration` override apply only to that navigation path. Prior scroll-restoration and visibility settings are restored when stabilization stops. The snapshot expires after ten seconds and is removed once stabilization stops. No account information is stored.

## Extension path

The Booking selector and site matching currently belong to this one feature. When a second site or independent feature is added, introduce a small site adapter that owns selectors, activation rules, and DOM observations for that site. Keep the stabilization algorithm reusable and keep permissions scoped to the sites that need them. Add a UI framework only if a real interface needs it; this script currently has no UI.

Before broadening the site scope, test the feature against real pages in a browser and keep sample DOM cases for the layout variants that caused regressions. The Node tests and headless smoke fixture exercise matching and lifecycle, but cannot prove that a live Booking layout still exposes the same attributes.
