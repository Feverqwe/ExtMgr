import {useSyncExternalStore} from 'react';

interface SubscribableStore {
  subscribe(listener: () => void): () => void;
  getVersion(): number;
}

const useStoreVersion = (store: SubscribableStore) => {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
};

export default useStoreVersion;
