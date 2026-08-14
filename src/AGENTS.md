# Source agent guide

These instructions apply under `src/` and supplement the repository-level `AGENTS.md`.

## Runtime architecture

- `App.tsx` creates `RootStore`, exposes it as `window.rootStore` for debugging, and mounts the React popup.
- `Popup.componentDidMount()` initializes extension data and Chrome listeners through `RootStore.init()`.
- `RootStore` owns discovery, event listeners, user/computed groups, and persistence.
- User groups store ordered extension IDs; computed groups derive members not referenced by user groups.

## Type and state conventions

- Use `.ts`/`.tsx` and keep `npm run tsc` clean in strict mode.
- Export `Instance<typeof Model>` aliases for MobX-State-Tree models consumed by components.
- Order or split MST `.views()`/`.actions()` blocks so TypeScript can see members referenced by later blocks.
- Use MST actions for mutations and `flow` for asynchronous mutations. Check `isAlive(self)` after yielded operations when a node may have been removed.
- Keep callback-based Chrome APIs behind typed Promise wrappers and inspect `chrome.runtime.lastError` inside callbacks.
- Resolve extension data by ID through the root store; do not duplicate full extension data in groups.
- Keep persisted group snapshots limited to `{id, name, ids}` unless a storage migration is included.
- Computed group edit/persistence methods are intentional no-ops because those groups are derived.

## UI and Storybook conventions

- Components use `observer()`/`inject()` wrappers rather than decorator syntax.
- Configure drag-and-drop once in `Popup.refGroups` and destroy SortableJS when the node unmounts.
- Group headers and extension rows share `.item`; only extension icons are drag handles.
- Action links must prevent their intended action from becoming a row toggle.
- Keep interface strings in both locale JSON files rather than hard-coding new labels in TSX.
- Put deterministic stories next to their component as `*.stories.tsx`.
- Extend the Chrome mock in `.storybook/preview.tsx` when a story renders code that accesses additional APIs.

## Manual checks

- The popup excludes itself and renders each installed item once.
- Reordering and moving items persists after reopening.
- Moving the last visible item removes an empty user group.
- Group checkbox state reflects all visible members and toggles them together.
- Enable, options, launch, and uninstall controls appear only when supported by metadata.
