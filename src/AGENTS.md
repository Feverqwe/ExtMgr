# Source agent guide

These instructions apply under `src/` and supplement the repository-level `AGENTS.md`.

## Runtime architecture

- `App.tsx` creates `RootStore`, exposes it as `window.rootStore` for debugging, and mounts the React popup with `createRoot()`.
- `Popup` initializes extension data and Chrome listeners through `RootStore.init()` in an effect.
- `RootStore` owns discovery, event listeners, user/computed groups, and persistence.
- User groups store ordered extension IDs; computed groups derive members not referenced by user groups.
- `global.d.ts`, `assets.d.ts`, and `vendor.d.ts` define the narrow global/module boundaries needed by Rspack, Chrome, assets, and untyped legacy packages.

## Type and state conventions

- Use `.ts`/`.tsx` and keep `npm run tsc` clean in strict mode.
- The project uses the automatic JSX transform; import only the React APIs and types each TSX module uses.
- Keep store mutations inside typed store methods and call `RootStore.notify()` after observable state changes.
- Components subscribe to stores through `useStoreVersion()` and React's `useSyncExternalStore`.
- Keep callback-based Chrome APIs behind typed Promise wrappers and inspect `chrome.runtime.lastError` inside callbacks.
- Resolve extension data by ID through the root store; do not duplicate full extension data in groups.
- Keep persisted group snapshots limited to `{id, name, ids}` unless a storage migration is included.
- Preserve group IDs that do not currently resolve to an installed extension; they may become valid after sync or reinstall.
- Computed group edit/persistence methods are intentional no-ops because those groups are derived.

## UI and Storybook conventions

- Components receive stores through typed props and subscribe without third-party state bindings.
- Configure drag-and-drop once in `Popup.refGroups` and destroy SortableJS when the node unmounts.
- Group headers and extension rows share `.item`; only extension icons are drag handles.
- Action links must prevent their intended action from becoming a row toggle.
- Keep interface strings in both locale JSON files rather than hard-coding new labels in TSX.
- Put deterministic stories next to their component as `*.stories.tsx`.
- Extend the Chrome mock in `.storybook/preview.tsx` when a story renders code that accesses additional APIs.
- Do not redefine `globalThis.chrome` when a browser already exposes it. Add only the missing mocked namespace or method.
- Story actions must never call a real `chrome.management.uninstall`, mutate real extension state, or write to real sync storage.

## Manual checks

- The popup excludes itself and renders each installed item once.
- Reordering and moving items persists after reopening.
- Moving the last visible item removes an empty user group.
- Group checkbox state reflects all visible members and toggles them together.
- Enable, options, launch, and uninstall controls appear only when supported by metadata.
- Check the browser console when validating Storybook or the unpacked popup; successful compilation does not catch missing runtime Chrome mocks.
