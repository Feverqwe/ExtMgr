import {
  applySnapshot,
  flow,
  Instance,
  isAlive,
  resolveIdentifier,
  SnapshotIn,
  types,
} from 'mobx-state-tree';
import promiseLimit from 'promise-limit';
import uuidv4 from 'uuid/v4';
import ComputedGroupStore from './ComputedGroupStore';
import ExtensionStore, {type ExtensionStoreInstance} from './ExtensionStore';
import GroupStore from './GroupStore';
import extensionTypes from '../tools/extensionTypes';
import getLogger from '../tools/getLogger';
import storageGet from '../tools/storageGet';
import storageSet from '../tools/storageSet';

const logger = getLogger('rootStore');
const oneLimit = promiseLimit(1);

type UserGroupSnapshot = SnapshotIn<typeof GroupStore>;
type InitResult = readonly [UserGroupSnapshot[], chrome.management.ExtensionInfo[]];

const RootStore = types
  .model('RootStore', {
    state: types.optional(types.enumeration(['idle', 'pending', 'done', 'error']), 'idle'),
    groups: types.array(GroupStore),
    computedGroups: types.array(ComputedGroupStore),
    extensions: types.map(ExtensionStore),
  })
  .views((self) => ({
    getGroupById(id: string) {
      return (
        resolveIdentifier(GroupStore, self, id) || resolveIdentifier(ComputedGroupStore, self, id)
      );
    },
    get extensionsWithoutGroup(): ExtensionStoreInstance[] {
      const usedIds: string[] = [];
      self.groups.forEach((group) => usedIds.push(...group.ids));

      return Array.from(self.extensions.values()).filter(
        (extension) => !usedIds.includes(extension.id),
      );
    },
  }))
  .actions((self) => ({
    syncUserGroups(userGroups: UserGroupSnapshot[]) {
      applySnapshot(self.groups, userGroups);
    },
    createGroup(group: {name: string; ids: string[]}) {
      self.groups.unshift({...group, id: uuidv4()});
    },
    removeGroupById(id: string) {
      const group = self.getGroupById(id);
      const position = group ? self.groups.indexOf(group as Instance<typeof GroupStore>) : -1;

      if (position !== -1) {
        self.groups.splice(position, 1);
        self.groups.forEach((item) => item.removeIfEmpty());
      }
    },
    setExtension(extension: chrome.management.ExtensionInfo) {
      try {
        self.extensions.set(extension.id, extension as SnapshotIn<typeof ExtensionStore>);
      } catch (error) {
        logger.error('set extension error', extension, error);
      }
    },
    removeExtensionById(id: string) {
      self.extensions.delete(id);
    },
  }))
  .actions((self) => {
    const handleInstalled = (extension: chrome.management.ExtensionInfo) => {
      self.setExtension(extension);
    };
    const handleUninstalled = (id: string) => {
      self.removeExtensionById(id);
    };
    const handleStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === 'sync' && changes.list) {
        self.syncUserGroups((changes.list.newValue ?? []) as UserGroupSnapshot[]);
      }
    };
    const registerListeners = () => {
      chrome.storage.onChanged.addListener(handleStorageChanged);
      chrome.management.onInstalled.addListener(handleInstalled);
      chrome.management.onUninstalled.addListener(handleUninstalled);
      chrome.management.onEnabled.addListener(handleInstalled);
      chrome.management.onDisabled.addListener(handleInstalled);
    };

    return {
      init: flow(function* (): Generator<Promise<InitResult>, void, InitResult> {
        self.state = 'pending';
        try {
          const groupsPromise = storageGet<{list: UserGroupSnapshot[]}>({list: []}, 'sync').then(
            ({list: groups}) => {
              groups.forEach((group) => {
                if (!group.id) {
                  group.id = uuidv4();
                }
              });
              return groups;
            },
          );
          const [userGroups, extensions] = yield Promise.all([
            groupsPromise,
            chromeManagementGetAll(),
          ] as const);

          if (isAlive(self)) {
            extensions.forEach((extension) => {
              if (extension.id !== chrome.runtime.id) {
                self.setExtension(extension);
              }
            });

            applySnapshot(self.groups, userGroups);
            applySnapshot(
              self.computedGroups,
              [...extensionTypes, 'unknown'].map((type) => ({
                id: `computed:${type}`,
                computed: type,
              })),
            );

            registerListeners();
            self.state = 'done';
          }
        } catch (error) {
          logger.error('init error', error);
          if (isAlive(self)) {
            self.state = 'error';
          }
        }
      }),
      saveGroups() {
        return oneLimit(() => {
          const list = self.groups.map((group) => group.getSnapshot());
          return storageSet({list}, 'sync');
        });
      },
      initListeners() {
        registerListeners();
      },
      beforeDestroy() {
        chrome.storage.onChanged.removeListener(handleStorageChanged);
        chrome.management.onInstalled.removeListener(handleInstalled);
        chrome.management.onUninstalled.removeListener(handleUninstalled);
        chrome.management.onEnabled.removeListener(handleInstalled);
        chrome.management.onDisabled.removeListener(handleInstalled);
      },
    };
  });

const chromeManagementGetAll = () => {
  return new Promise<chrome.management.ExtensionInfo[]>((resolve, reject) => {
    chrome.management.getAll((result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

export type RootStoreInstance = Instance<typeof RootStore>;

export default RootStore;
