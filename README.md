<div align="center">

<img src="assets/icon.svg" width="88" alt="Booking.com Stable Filter Scroll icon">

# Booking.com Stable Filter Scroll

Keeps the Booking.com filter sidebar from jumping around while filters update.

[![Install on Greasy Fork](https://img.shields.io/badge/Install-Greasy%20Fork-670000?style=for-the-badge&logo=greasyfork&logoColor=white)](https://greasyfork.org/en/scripts/596873-booking-com-stable-filter-scroll)
[![Direct install](https://img.shields.io/badge/Direct%20install-userscript-006CE4?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js)

[![Greasy Fork version](https://img.shields.io/greasyfork/v/596873?label=version)](https://greasyfork.org/en/scripts/596873-booking-com-stable-filter-scroll)
[![Greasy Fork installs](https://img.shields.io/greasyfork/dt/596873?label=installs)](https://greasyfork.org/en/scripts/596873-booking-com-stable-filter-scroll)
[![Validation](https://github.com/fakie-dev/booking-stable-filter-scroll/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/fakie-dev/booking-stable-filter-scroll/actions/workflows/validate.yml)
[![License](https://img.shields.io/github/license/fakie-dev/booking-stable-filter-scroll)](LICENSE)
[![Stars](https://img.shields.io/github/stars/fakie-dev/booking-stable-filter-scroll?style=flat&logo=github)](https://github.com/fakie-dev/booking-stable-filter-scroll/stargazers)

[Install](#install) · [How it works](#how-it-works) · [Privacy](#privacy) · [Report a bug](https://github.com/fakie-dev/booking-stable-filter-scroll/issues/new?template=bug_report.yml) · [Русский](README.ru.md)

</div>

---

I made this after getting tired of Booking.com's filter list shifting under the cursor. Select a filter, Booking updates or reorders the list, and the part you were looking at moves.

The script keeps the visible part of the filter sidebar roughly where it was. It does not replace Booking's UI, batch clicks, or fake checkbox state.

## Install

The easiest option is **[Greasy Fork](https://greasyfork.org/en/scripts/596873-booking-com-stable-filter-scroll)**. It keeps installation counts in one place and updates through Greasy Fork.

You can also install directly from GitHub:

1. Install [Tampermonkey](https://www.tampermonkey.net/) or another compatible userscript manager.
2. Open [`booking-stable-filter-scroll.user.js`](https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js).
3. Review the source and press **Install**.

## What it fixes

The jump is not always a simple `scrollTo(0, 0)`. Booking can reorder selected filters, insert or remove rows, or rebuild part of the sidebar. That changes the layout around the viewport and makes the page appear to move.

The script remembers a few visible filter rows, ignores the one you just clicked, and compensates for the movement of the remaining rows while Booking is updating.

## How it works

<details>
<summary>Technical details</summary>

When a filter is pressed, the script:

- remembers several nearby visible filter rows;
- watches the filter DOM for a short time;
- measures how far those rows moved;
- adjusts the page by the median movement;
- temporarily disables native scroll anchoring and competing programmatic scrolls;
- gets out of the way as soon as you scroll manually.

For a full navigation, the same anchor data is kept briefly in `sessionStorage` and discarded after the restore window.

There is no build step and no injected UI.

</details>

## Privacy

| | |
| --- | --- |
| Userscript permissions | `@grant none` |
| External libraries | None |
| `@require` | None |
| Network requests | None |
| Analytics / telemetry | None |
| Account data access | None |

The only stored value is short-lived scroll restoration data in the current tab's `sessionStorage`.

## Updates

- Installs from **Greasy Fork** update through Greasy Fork.
- Direct GitHub installs use this repository's `@updateURL` and `@downloadURL`.

Greasy Fork strips external update URLs from scripts installed there, so the two install paths do not fight each other.

## Compatibility

The script runs on Booking.com search result pages:

```text
https://www.booking.com/searchresults...
```

Booking changes its frontend frequently, including A/B-tested layouts. If the script stops holding the sidebar in place, [open an issue](https://github.com/fakie-dev/booking-stable-filter-scroll/issues/new?template=bug_report.yml) and include your browser, userscript manager version, and a short screen recording if possible.

## Development

No dependencies are required.

```bash
git clone https://github.com/fakie-dev/booking-stable-filter-scroll.git
cd booking-stable-filter-scroll
node --check booking-stable-filter-scroll.user.js
node scripts/validate.mjs
```

Bump both metadata files at once:

```bash
node scripts/set-version.mjs 1.1.1
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the project rules.

## License

MIT. See [LICENSE](LICENSE).

If it fixed the problem for you, starring the repo helps other people find it.
