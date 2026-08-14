# AGENTS.md

## Project overview

This repository contains **Extensions switcher (extMgr)**, a Manifest V2 Chrome extension popup for managing installed extensions and legacy Chrome Apps. Source code is strict TypeScript/React 19 with local typed stores; Rspack builds the extension and Storybook provides isolated UI states.

Read `README.md` before broad changes. Preserve runtime behavior unless the task explicitly requests a migration or redesign.

## Source of truth

- `src/manifest.json`: extension version, permissions, popup, icons, and minimum Chrome version.
- `src/stores/`: state, persistence, and Chrome API operations.
- `src/pages/Popup.tsx`: top-level rendering and drag-and-drop grouping.
- `src/components/`: group/extension interactions and stories.
- `src/_locales/`: user-facing translated strings.
- `rspack.config.js`: compilation, HTML generation, copied assets, and output layout.
- `builder/compressDist.js`: release ZIP packaging.
- `.storybook/`: isolated rendering setup and browser API mocks.
- `tsconfig.json`, `eslint.config.mjs`, and `.prettierrc.json`: type and style policy.

Generated `dist/`, `storybook-static/`, and `node_modules/` content is not source and must not be committed.

## Commands

Use the Node.js version pinned in `.nvmrc`:

```bash
nvm use
npm ci
npm run tsc
npm run lint
npm run build
npm run build-storybook
```

- `npm run dev` runs the Rspack watcher; `npm run watch` is an alias.
- `npm run release` writes `dist/extMgr-<manifest-version>.zip` and is only required when an archive is requested.
- There are no unit/e2e tests. Do not claim tests passed; report typecheck, lint, builds, and manual checks separately.
- Use `npm install` only when intentionally changing dependencies. Commit the resulting `package.json` and `package-lock.json` together; do not edit the lockfile manually.

## Change rules

- Keep strict TypeScript green; avoid `any`, `@ts-ignore`, and broad casts. Narrow boundary casts are acceptable for Chrome API definitions when explained by the surrounding type.
- Keep changes focused; do not migrate Manifest V2 or the state architecture incidentally.
- Treat `@types/chrome` as compile-time coverage, not proof that an API exists in Manifest V2 or in the minimum browser declared by the manifest. Check runtime availability before adopting a newer API.
- The project uses the automatic JSX runtime in both TypeScript and Rspack. Import React APIs and types explicitly when a module uses them.
- Preserve `chrome.runtime.lastError` checks inside callback-based Chrome API wrappers.
- Exclude this extension's own `chrome.runtime.id` from the managed extension map.
- Preserve ordering and temporarily unknown IDs in stored group `ids`.
- Save groups through `RootStore.saveGroups()` so writes remain serialized by `promise-limit(1)`.
- Serialize snapshots/plain data, never live store instances, into Chrome storage.
- Keep user groups persisted and computed groups derived/non-persisted.
- Update English and Russian locale files together for user-facing copy.
- Keep Storybook deterministic. Mock Chrome APIs; never depend on an installed extension or a signed-in browser session.
- Add or update stories when reusable rendered states change.
- Do not use `npm audit fix --force` or broad dependency upgrades as incidental cleanup; legacy runtime changes require dedicated compatibility work.

## Change map

- UI rendering or interaction: update the component, relevant styles/locales, and stories.
- Chrome extension behavior: update the relevant store/tool wrapper and manually verify the unpacked extension.
- Stored group shape: update snapshots, sync handling, documentation, and include a migration for existing data.
- Build assets or entry points: update `rspack.config.js`, then inspect `dist/dist/`.
- Release layout or naming: update `builder/compressDist.js`, then inspect the ZIP contents.
- Dependency/tooling changes: update both package files and run the full automated validation set.

## Verification

For source changes, run `npm run tsc`, `npm run lint`, and `npm run build`. For rendered UI changes, also run `npm run build-storybook` and inspect the relevant stories at normal and narrow popup widths.

For Chrome behavior, load `dist/dist/` as an unpacked extension in a compatible browser. Verify affected actions; only exercise uninstall when explicitly intended.

For packaging changes, run `npm run release`, inspect the ZIP file list, and confirm `manifest.json` is at its root.

For dependency changes, start from a clean `npm ci` before the final checks and report remaining `npm audit` findings without applying unrequested breaking fixes.

Preserve unrelated user changes in a dirty worktree and explicitly report checks that could not be performed.
