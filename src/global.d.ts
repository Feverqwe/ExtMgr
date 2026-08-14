import type {RootStoreInstance} from './stores/RootStore';

declare global {
  const BUILD_ENV:
    | {
        mode: 'development' | 'production';
        FLAG_ENABLE_LOGGER: boolean;
      }
    | undefined;

  interface Window {
    rootStore: RootStoreInstance;
  }
}

export {};
