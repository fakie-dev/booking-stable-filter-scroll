# Roadmap and technical choices

This repository starts with one focused Booking.com feature, but the build and source layout allow additional site adapters and independent browser features. New features should be driven by a concrete user problem and a browser reproduction. Keep the installed artifact small and auditable.

## Chosen baseline

- **Runtime:** modern browser JavaScript. No framework or external runtime dependency for the current feature.
- **Tooling:** Node.js 26, npm lockfile, Vite 8, and `vite-plugin-monkey` 8. The plugin understands userscript metadata and supports a development install URL; Vite creates the single release artifact.
- **Tests:** Node's built-in test runner for DOM-independent behavior; browser checks for site integration.
- **Release:** unminified generated `.user.js` plus `.meta.js` committed at the existing URLs, verified by CI and attached to version tags.

`tsdown` is a good library bundler but does not provide the userscript-specific development and metadata workflow this project needs. TypeScript can be introduced module by module when the source grows enough to benefit from stricter interfaces; it does not need to be a prerequisite for the current 400-line script. A UI framework is similarly deferred until there is an actual interface.

## Next decisions

1. Identify the next feature and whether it belongs to this userscript or a separate script. That determines site matches, permissions, and release naming.
2. Add browser-level regression coverage around real filter DOM variants before changing the stabilization behavior substantially.
3. Decide whether future settings need per-tab or persistent storage. Review permissions and privacy documentation at that point.
4. If multiple sites are supported, extract explicit adapters and consider TypeScript for their shared contracts.

The project should avoid broad `@match` patterns, remote executable code, and new grants without a feature that requires them. Public changes should remain reviewable in the generated userscript.

## References

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [vite-plugin-monkey configuration](https://vite-plugin-monkey.pages.dev/guide/configuration)
- [vite-plugin-monkey development setup](https://vite-plugin-monkey.pages.dev/guide/getting-started)
- [Greasy Fork code rules](https://greasyfork.org/en/help/code-rules)
