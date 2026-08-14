type StorageAreaName = 'local' | 'sync';

const storageGet = <T extends object>(data: T, area: StorageAreaName = 'local') => {
  return new Promise<T>((resolve, reject) =>
    chrome.storage[area].get(data, (result) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(err);
      } else {
        resolve(result as T);
      }
    }),
  );
};

export default storageGet;
