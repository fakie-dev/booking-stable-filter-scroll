# Quality gates and evidence

This document records what the project can verify today. It is a checklist for
review, not a numerical score. A passing command only supports the claim it
actually checks.

| Area | Current gate | Limit |
| --- | --- | --- |
| Reproducible toolchain | Node.js 26, `package-lock.json`, `npm ci` in CI | Dependency updates still need review. |
| Build consistency | `npm run build` and CI `git diff --exit-code` for both root artifacts | This proves the committed artifacts match the build on CI, not that the script works on Booking. |
| Metadata and syntax | `npm run check` syntax-checks the main entry and built script, then checks synchronized headers, version, required matches, and no `@require`/`@connect` | It does not inspect every runtime API or verify site selectors. |
| Anchor and lifecycle behavior | `npm test` checks duplicate matching, correction, manual-scroll cleanup, and navigation restoration with DOM stubs | It does not cover Booking's actual page lifecycle, all browser engines, or userscript managers. |
| Built browser behavior | `npm run test:browser` runs the built script in a local headless Chromium fixture | The fixture is synthetic; this check is optional locally and not in CI. |
| Release version | Release workflow checks the pushed tag against userscript `@version` before attaching artifacts | Pushing a tag still publishes a GitHub release; review before tagging. |
| Security and privacy | Small userscript metadata scope and readable unminified artifact | No formal security audit or network-behavior instrumentation has been completed. |

## Review checklist

For a source or tooling change, run `npm ci` when dependencies change or are
not installed, then `npm run build`, `npm run check`, and `npm test`. Run
`npm run test:browser` for scroll behavior changes when Chrome or Chromium is
available. Inspect the generated `.user.js` and `.meta.js` diff, including metadata, URLs, grants,
and unexpected bundled code. Check `git status` and the staged file list before
committing. CI runs the build and Node checks for pull requests to `main` and
pushes to any branch. The browser smoke test remains a local check.

For a filter behavior or selector change, test the built script on a live
Booking.com search results page. Verify one click, rapid consecutive clicks,
promotion into Popular filters and duplicate rows, full navigation, and manual
wheel, touch, and keyboard scrolling. Record browser and userscript-manager
versions and any layout variant. A screen recording or reduced DOM fixture is
useful for a regression, but do not put account data in an issue or fixture.

For a release, update `CHANGELOG.md`, set the intended version with
`node scripts/set-version.mjs x.y.z`, rerun the gates, review the generated
artifact, and then tag only the commit meant to be published.

## Open gaps

The browser fixture is synthetic and does not contain a representative Booking
search page or a userscript manager. The next meaningful quality improvement is
a set of sanitized DOM fixtures for known layout variants and a live-site run
with a userscript manager. Add fixtures when a concrete regression or new
feature provides cases to preserve. Until then, report live browser checks
separately from fixture results.
