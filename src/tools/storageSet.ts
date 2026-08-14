import copyData from './copyData';

type StorageAreaName = 'local' | 'sync';

const storageSet = (data: object, area: StorageAreaName = 'local') => {
  return new Promise<void>((resolve, reject) =>
    chrome.storage[area].set(copyData(data), () => {
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
