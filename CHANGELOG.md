# Changelog

## Unreleased

## [1.1.3] - 2026-09-25

- Prevented upward jumps caused by stale in-page position fallback, a final correction after manual scrolling, and competing `scrollBy` calls.
- Reduced active DOM work to one filter scan per correction and disconnected the observer while idle.
- Added lifecycle regression tests and a headless-browser smoke check of the built script.
- Added a reproducible Node.js and Vite userscript build with local browser development.
- Split source code from the committed install artifacts and added behavioral tests.
- Documented the architecture, development workflow, and future extension path.
- Documented explicit quality gates.

## [1.1.2] - 2026-09-22

- Added Russian locale metadata to the userscript header.

## [1.1.1] - 2026-09-22

- Fixed scroll jumps when Booking promotes a selected filter into **Popular filters**.
- Anchor matching now distinguishes duplicate filter rows by their previous document position.
- Added outlier-resistant anchor compensation and a longer settle window for delayed reordering.
- Fixed rapid consecutive filter clicks so the newest restore state is not discarded.
- Replaced the project artwork and added a transparent PNG icon set.

## [1.1.0] - 2026-09-22

- Added project icon metadata for userscript managers.
- Added Greasy Fork installation and live install/version badges.
- Added synced Greasy Fork descriptions in English and Russian.
- Added repository social preview artwork.

## 1.0.0 — 2026-09-22

First public release.

- Keeps the visible filter area stable while Booking.com rebuilds or reorders filters.
- Uses several nearby filter rows as anchors instead of following the clicked filter.
- Handles both in-page updates and full navigations.
- Stops stabilizing as soon as the user scrolls manually.
- Includes Tampermonkey update metadata and basic GitHub Actions checks.
