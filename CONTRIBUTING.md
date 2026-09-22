# Contributing

Small fixes are welcome. This script is intentionally tiny, so focused changes are much easier to review than broad refactors.

Before opening a PR:

- reproduce the issue on a Booking.com search results page;
- keep Booking's own filter behavior untouched unless there is no other option;
- don't add analytics, telemetry, remote code, runtime dependencies, or extra userscript permissions;
- make sure manual scrolling always wins over automatic stabilization;
- run:

```bash
node --check booking-stable-filter-scroll.user.js
node scripts/validate.mjs
```

If the bug is visual, a short screen recording is usually more useful than a long description.

Commit messages use conventional commits where it makes sense, for example:

```text
fix: keep anchors stable after filter reordering
feat: support another filter container
docs: clarify installation steps
chore: release 1.0.1
```
