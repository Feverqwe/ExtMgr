type StorageAreaName = 'local' | 'sync';

const storageRemove = (keys: string | string[], area: StorageAreaName = 'local') => {
  return new Promise<void>((resolve, reject) =>
    chrome.storage[area].remove(keys, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    }),
  );
};

export default storageRemove;
