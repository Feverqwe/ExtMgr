type StorageAreaName = 'local' | 'sync';

const storageSet = (data: object, area: StorageAreaName = 'local') => {
  return new Promise<void>((resolve, reject) =>
    chrome.storage[area].set(data, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    }),
  );
};

export default storageSet;
