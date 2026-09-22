# Changelog

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
