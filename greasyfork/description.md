# Booking.com Stable Filter Scroll

> Unofficial userscript. Not affiliated with or endorsed by Booking.com.

Booking.com's filter list can move around after every click: selected items get reordered, rows appear or disappear, and the part of the sidebar you were looking at shifts.

This script keeps the visible part of the filter sidebar roughly in place while Booking updates it.

## What it does

- keeps normal Booking.com filters and checkboxes untouched;
- compensates for layout shifts while filters update;
- ignores the clicked filter as an anchor because Booking may move it;
- handles filters promoted into the **Popular filters** section without following the promoted copy;
- stops immediately when you scroll manually;
- works without external libraries or extra UI.

## Privacy

The script has `@grant none`, makes no network requests, contains no analytics or telemetry, and does not read Booking account data.

It only uses short-lived `sessionStorage` data when a page navigation needs the scroll position restored.

## Source and bug reports

Source code: https://github.com/fakie-dev/booking-stable-filter-scroll

Issues: https://github.com/fakie-dev/booking-stable-filter-scroll/issues

MIT licensed.
