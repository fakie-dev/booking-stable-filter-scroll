<div align="center">

# Booking.com Stable Filter Scroll

Keeps the Booking.com filter sidebar from jumping around while filters update.

[![Install userscript](https://img.shields.io/badge/Install-userscript-006CE4?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js)

[![Release](https://img.shields.io/github/v/release/fakie-dev/booking-stable-filter-scroll?display_name=tag&sort=semver)](https://github.com/fakie-dev/booking-stable-filter-scroll/releases/latest)
[![Validation](https://github.com/fakie-dev/booking-stable-filter-scroll/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/fakie-dev/booking-stable-filter-scroll/actions/workflows/validate.yml)
[![License](https://img.shields.io/github/license/fakie-dev/booking-stable-filter-scroll)](LICENSE)
[![Stars](https://img.shields.io/github/stars/fakie-dev/booking-stable-filter-scroll?style=flat&logo=github)](https://github.com/fakie-dev/booking-stable-filter-scroll/stargazers)
[![Open issues](https://img.shields.io/github/issues/fakie-dev/booking-stable-filter-scroll)](https://github.com/fakie-dev/booking-stable-filter-scroll/issues)
[![Last commit](https://img.shields.io/github/last-commit/fakie-dev/booking-stable-filter-scroll)](https://github.com/fakie-dev/booking-stable-filter-scroll/commits/main)

[Install](#install) · [How it works](#how-it-works) · [Privacy](#privacy) · [Report a bug](https://github.com/fakie-dev/booking-stable-filter-scroll/issues/new?template=bug_report.yml) · [Русский](README.ru.md)

</div>

---

I made this because Booking.com's filter sidebar kept moving while I was narrowing down a search. Select a filter, the list gets rebuilt or reordered, and suddenly the part you were looking at is somewhere else.

This userscript keeps that part of the sidebar in roughly the same place on screen while Booking updates it. It does **not** replace Booking's filter UI, batch clicks, or fake checkbox state.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or another compatible userscript manager).
2. Open **[booking-stable-filter-scroll.user.js](https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js)**.
3. Review the source and press **Install**.

That's it. Open Booking.com search results and use the filters normally.

## What it fixes

The annoying case is not always a plain `scrollTo(0, 0)`. Booking may move selected filters, insert/remove rows, or rebuild part of the sidebar. That changes the layout above your current viewport and makes the page appear to jump.

The script watches a few visible filter rows around the current viewport and compensates for their movement while the update is happening. The filter you just clicked is deliberately ignored because Booking may move it somewhere else.

## How it works

<details>
<summary>Technical details</summary>

When a filter is pressed, the script:

- remembers several nearby visible filter rows;
- watches the filter DOM for a short time;
- measures how far the remembered rows moved;
- adjusts the page by the median of those movements;
- temporarily disables native scroll anchoring and programmatic scrolling that would fight the correction;
- stops immediately if you start scrolling yourself.

For a full navigation, the same anchor data is kept briefly in `sessionStorage` and discarded after the restore window.

There is no build step and no injected UI.

</details>

## Privacy

The script is intentionally boring in this regard:

| | |
| --- | --- |
| Userscript permissions | `@grant none` |
| External libraries | None |
| `@require` | None |
| Network requests | None |
| Analytics / telemetry | None |
| Account data access | None |

The only stored value is short-lived scroll restoration data in the current tab's `sessionStorage`.

## Automatic updates

Tampermonkey checks the lightweight [`booking-stable-filter-scroll.meta.js`](booking-stable-filter-scroll.meta.js) file for a newer `@version`. If one is available, it downloads the updated userscript from this repository.

The URLs are part of the userscript metadata, so users who install from GitHub keep receiving releases without reinstalling manually. Tampermonkey still controls how often it checks and whether updates are installed automatically.

## Compatibility

The script runs on Booking.com search result pages:

```text
https://www.booking.com/searchresults...
```

Booking changes its frontend fairly often, including A/B-tested layouts, so a future markup change may need a small compatibility update. If you hit one, [open an issue](https://github.com/fakie-dev/booking-stable-filter-scroll/issues/new?template=bug_report.yml) and include your browser, userscript manager version, and a short screen recording if possible.

## Development

No dependencies are required.

```bash
git clone https://github.com/fakie-dev/booking-stable-filter-scroll.git
cd booking-stable-filter-scroll
node --check booking-stable-filter-scroll.user.js
node scripts/validate.mjs
```

To bump both userscript metadata files at once:

```bash
node scripts/set-version.mjs 1.0.1
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the few project rules.

## License

MIT. See [LICENSE](LICENSE).

If this fixed the problem for you, a ⭐ makes the project easier to find for the next person who searches for the same thing.
