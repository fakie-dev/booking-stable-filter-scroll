# Contributing

Small fixes are welcome. Keep changes focused and reviewable in both the source and generated userscript.

Before opening a PR:

- reproduce the issue on a Booking.com search results page;
- keep Booking's own filter behavior untouched unless there is no other option;
- don't add analytics, telemetry, remote code, runtime dependencies, or extra userscript permissions;
- make sure manual scrolling always wins over automatic stabilization;
- edit `src/` and run the build to update the generated files;
- run:

```bash
npm ci
npm run build
npm run check
npm test
```

If the bug is visual, a short screen recording is usually more useful than a long description.

The [quality gates](docs/quality.md) explain what the automated checks prove and
which behavior needs a live browser check. Include the browser and userscript
manager versions when reporting a site-specific result.

Commit messages start with a Conventional Commits type and use a gitmoji in the subject. Keep them specific and human-readable, for example:

```text
fix: 🐛 keep anchors stable after filter reordering
feat: ✨ support another filter container
docs: 📝 clarify installation steps
chore: 🔖 release 1.1.3
```
