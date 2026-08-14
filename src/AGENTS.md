# Source agent guide

These instructions apply under `src/` and supplement the repository-level `AGENTS.md`.

## Runtime architecture

- `App.tsx` mounts the popup inside `PopupProvider` with `createRoot()`.
- `PopupProvider` owns discovery, state transitions, Chrome listeners, user/computed groups, and serialized persistence.
- `chromePopupServices.ts` is the typed boundary around Promise-based Manifest V3 Chrome APIs.
- User groups store ordered extension IDs; computed groups derive members not referenced by user groups.
- `global.d.ts` and `assets.d.ts` define the narrow global/module boundaries needed by Rspack, Chrome, and assets.

## Type and state conventions

- Use `.ts`/`.tsx` and keep `npm run tsc` clean in strict mode.
- The project uses the automatic JSX transform; import only the React APIs and types each TSX module uses.
- Keep shared popup mutations in the typed reducer/actions exposed by `usePopup()`.
- Components read shared state and actions through `usePopup()`; keep short-lived view state local.
- Keep Chrome APIs behind `PopupServices` and handle rejected promises at the context boundary.
- Resolve extension data by ID through the context; do not duplicate full extension data in groups.
- Keep persisted group snapshots limited to `{id, name, ids}` unless a storage migration is included.
- Preserve group IDs that do not currently resolve to an installed extension; they may become valid after sync or reinstall.
- Computed groups are derived and must not be edited or persisted.

## UI and Storybook conventions

- Components receive shared popup data through context without third-party state bindings.
- Keep dnd-kit orchestration in `Popup`; extension icons are the pointer and keyboard drag activators.
- Group headers and extension rows share `.item`; only extension icons are drag handles.
- Treat the popup as a fixed 320-pixel desktop surface. Keep group and extension rows at least 36 pixels high, action/name controls at least 32 pixels high, action buttons 32 by 32 pixels, and drag handles at least 40 by 32 pixels.
- Keep checkbox glyphs at least 16 by 16 pixels inside a 32-by-32 clickable `label`; clicking the surrounding hit area must toggle the checkbox, and keyboard focus must remain visible around the full hit area.
- Keep conditional action combinations usable within the popup width; extension names may ellipsize, but controls must not shrink below their target sizes.
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
- Checkbox padding is clickable, and keyboard focus outlines the full 32-by-32 target.
- Rows remain readable and every supported action stays reachable at the fixed 320-pixel popup width; inspect a narrower Storybook viewport separately for clipping.
- Enable, options, launch, and uninstall controls appear only when supported by metadata.
- Check the browser console when validating Storybook or the unpacked popup; successful compilation does not catch missing runtime Chrome mocks.
