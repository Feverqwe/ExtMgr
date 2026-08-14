# Build agent guide

These instructions apply under `builder/` and supplement the repository-level `AGENTS.md`.

## Build contract

- Rspack configuration lives at `rspack.config.js`; `builder/compressDist.js` only creates the release archive.
- Rspack writes the unpacked extension to `dist/dist/` and cleans that directory per build.
- `compressDist.js` packages it as `dist/extMgr-<version>.zip`.
- The version comes from `src/manifest.json`.
- The ZIP root must contain `manifest.json`, compiled assets, icons, and locales without an extra `dist/` directory.

## Change rules

- Resolve paths from `__dirname` or explicit repository paths.
- Keep clean/output operations restricted to generated `dist/` content.
- Import runtime assets through Rspack or add an explicit `CopyRspackPlugin` pattern.
- Check both development and production modes when changing SWC targets, source maps, Less handling, HTML generation, copied assets, or output layout.

## Verification

Run `npm run tsc`, `npm run lint`, and `npm run build` for build configuration changes. For packaging changes, also run `npm run release`, inspect the ZIP file list, and confirm `manifest.json` is at the archive root.
