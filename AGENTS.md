# AGENTS.md

## Project overview

This repository contains **Extensions switcher (extMgr)**, a Manifest V2 Chrome extension popup for managing installed extensions and legacy Chrome Apps. Source code is strict TypeScript/React 16 with MobX-State-Tree; Rspack builds the extension and Storybook provides isolated UI states.

Read `README.md` before broad changes. Preserve runtime behavior unless the task explicitly requests a migration or redesign.

## Source of truth

- `src/manifest.json`: extension version, permissions, popup, icons, and minimum Chrome version.
- `src/stores/`: state, persistence, and Chrome API operations.
- `src/pages/Popup.tsx`: top-level rendering and drag-and-drop grouping.
- `src/components/`: group/extension interactions and stories.
- `src/_locales/`: user-facing translated strings.
- `rspack.config.js`: compilation, HTML generation, copied assets, and output layout.
- `builder/compressDist.js`: release ZIP packaging.

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

## Change rules

- Keep strict TypeScript green; avoid `any`, `@ts-ignore`, and broad casts. Narrow boundary casts are acceptable for old MobX-State-Tree or Chrome API definitions when explained by the surrounding type.
- Keep changes focused; do not migrate Manifest V2, React, or MobX incidentally.
- Preserve `chrome.runtime.lastError` checks inside callback-based Chrome API wrappers.
- Exclude this extension's own `chrome.runtime.id` from the managed extension map.
- Preserve ordering and temporarily unknown IDs in stored group `ids`.
- Save groups through `RootStore.saveGroups()` so writes remain serialized by `promise-limit(1)`.
- Serialize snapshots/plain data, never live MobX-State-Tree nodes, into Chrome storage.
- Keep user groups persisted and computed groups derived/non-persisted.
- Update English and Russian locale files together for user-facing copy.
- Keep Storybook deterministic. Mock Chrome APIs; never depend on an installed extension or a signed-in browser session.
- Add or update stories when reusable rendered states change.

## Verification

For source changes, run `npm run tsc`, `npm run lint`, and `npm run build`. For rendered UI changes, also run `npm run build-storybook` and inspect the relevant stories at normal and narrow popup widths.

For Chrome behavior, load `dist/dist/` as an unpacked extension in a compatible browser. Verify affected actions; only exercise uninstall when explicitly intended.

For packaging changes, run `npm run release`, inspect the ZIP file list, and confirm `manifest.json` is at its root.

Preserve unrelated user changes in a dirty worktree and explicitly report checks that could not be performed.
