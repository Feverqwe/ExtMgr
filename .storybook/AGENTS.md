# Storybook agent guide

These instructions apply under `.storybook/` and supplement the repository-level `AGENTS.md`. Stories under `src/` also inherit `src/AGENTS.md`.

## Purpose

Storybook is the deterministic UI harness for this extension. It runs as an ordinary web page, not as a privileged Chrome extension, so every used Chrome API must be mocked.

## Mocking rules

- Keep shared mocks in `preview.tsx` small and deterministic. Put scenario-specific behavior in the story when it would make the global mock stateful.
- A Chrome browser may already expose a non-configurable `globalThis.chrome`. Never redefine that object; add only a missing namespace or method.
- Mock only APIs required for rendering or an explicit interaction scenario.
- Never forward calls to real `chrome.management`, `chrome.storage`, `chrome.tabs`, or other privileged APIs.
- Do not depend on browser profile data, installed extensions, network requests, time, or random IDs.
- Keep locale messages explicit so stories do not depend on extension packaging.

## Story conventions

- Store component stories beside the component as `*.stories.tsx`.
- Construct a fresh MobX-State-Tree root/model inside each story render to avoid shared mutable state.
- Represent enabled, disabled, loading, empty, mixed, and unsupported-action states when relevant.
- Use the real popup Less stylesheet and `.groups` container so dimensions and nested selectors match production.
- React 16 requires classic JSX and explicit `React` imports.

## Verification

Run:

```bash
npm run tsc
npm run lint
npm run build-storybook
```

For rendered changes, launch `npm run storybook` after implementation is coherent. Inspect affected stories at the normal popup width and a narrow viewport, and check the browser console for missing mocks or render errors. Report the stories and states inspected.
