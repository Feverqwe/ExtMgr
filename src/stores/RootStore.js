import {flow, isAlive, resolveIdentifier, types} from 'mobx-state-tree';
import GroupStore from "./GroupStore";
import ExtensionStore from "./ExtensionStore";
import getLogger from "../tools/getLogger";
import storageSet from "../tools/storageSet";
import storageGet from "../tools/storageGet";
import ComputedGroupStore from "./ComputedGroupStore";
import extensionTypes from "../tools/extensionTypes";

const logger = getLogger('rootStore');
const promiseLimit = require('promise-limit');
const uuidv4 = require('uuid/v4');
const oneLimit = promiseLimit(1);

/**
 * @typedef {Object} RootStore
 * @property {string} [state]
 * @property {GroupStore[]} groups
 * @property {ComputedGroupStore[]} computedGroups
 * @property {Map<*,ExtensionStore>} extensions
 * @property {function:Promise} init
 * @property {function} syncUserGroups
 * @property {function} createGroup
 * @property {function} removeGroupById
 * @property {function} setExtension
 * @property {function} removeExtensionById
 * @property {function} getGroupById
 * @property {*} extensionsWithoutGroup
 * @property {function} saveGroups
 * @property {function} initListeners
 * @property {function} beforeDestroy
 */
const RootStore = types.model('RootStore', {
  state: types.optional(types.enumeration(['idle', 'pending', 'done', 'error']), 'idle'),
  groups: types.array(GroupStore),
  computedGroups: types.array(ComputedGroupStore),
  extensions: types.map(ExtensionStore),
}).actions(self => {
  return {
    init: flow(function* () {
      self.state = 'pending';
      try {
        const [userGroups, extensions] = yield Promise.all([
          storageGet({list: []}, 'sync').then(storage => storage.list),
          chromeManagementGetAll()
        ]);

        if (isAlive(self)) {
          extensions.forEach((extension) => {
            if (extension.id !== chrome.runtime.id) {
              try {
                self.setExtension(extension);
              } catch (err) {
                logger.error('setExtension error', extension, err);
              }
            }
          });

          self.groups = prepGroups(userGroups);
          self.computedGroups = [...extensionTypes, 'unknown'].map((type) => {
            return {
              id: `computed:${type}`,
              computed: type,
            };
          });

          self.initListeners();
          self.state = 'done';
        }
      } catch (err) {
        logger.error('init error', err);
        if (isAlive(self)) {
          self.state = 'error';
        }
      }
    }),
    syncUserGroups(userGroups) {
      self.groups = prepGroups(userGroups);
    },
    createGroup(group) {
      prepGroups([group]);
      self.groups.unshift(group);
    },
    removeGroupById(id) {
      const group = self.getGroupById(id);
      const groups = self.groups.slice(0);

      const pos = groups.indexOf(group);
      if (pos !== -1) {
        groups.splice(pos, 1);
        self.groups = groups;
        self.groups.forEach(group => {
          group.removeIfEmpty();
        });
      }
    },
    setExtension(extension) {
      self.extensions.set(extension.id, prepExtension(extension));
    },
    removeExtensionById(id) {
      self.extensions.delete(id);
    },
  };
}).views(self => {
  const handleInstalledListener = extension => {
    self.setExtension(extension);
  };
  const handleUninstalledListener = id => {
    self.removeExtensionById(id);
  };
  const handleEnabled = extension => {
    self.setExtension(extension);
  };
  const handleDisabled = extension => {
    self.setExtension(extension);
  };
  const handleStorageChanged = (changes, areaName) => {
    if (areaName === 'sync') {
      if (changes.list) {
        self.syncUserGroups(changes.list.newValue);
      }
    }
  };

  return {
    getGroupById(id) {
      return resolveIdentifier(GroupStore, self, id) || resolveIdentifier(ComputedGroupStore, self, id);
    },
    get extensionsWithoutGroup() {
      const usedIds = [];
      self.groups.forEach(group => {
        usedIds.push(...group.ids);
      });
      let result = [];
      for (const [id, extension] of self.extensions.entries()) {
        if (usedIds.indexOf(id) === -1) {
          result.push(extension);
        }
      }
      return result;
    },
    saveGroups() {
      return oneLimit(() => {
        const list = self.groups.map(group => group.getSnapshot());
        return storageSet({list: list}, 'sync');
      });
    },
    initListeners() {
      chrome.storage.onChanged.addListener(handleStorageChanged);
      chrome.management.onInstalled.addListener(handleInstalledListener);
      chrome.management.onUninstalled.addListener(handleUninstalledListener);
      chrome.management.onEnabled.addListener(handleEnabled);
      chrome.management.onDisabled.addListener(handleDisabled);
    },
    beforeDestroy() {
      chrome.storage.onChanged.removeListener(handleStorageChanged);
      chrome.management.onInstalled.removeListener(handleInstalledListener);
      chrome.management.onUninstalled.removeListener(handleUninstalledListener);
      chrome.management.onEnabled.removeListener(handleEnabled);
      chrome.management.onDisabled.removeListener(handleDisabled);
    }
  };
});

const chromeManagementGetAll = () => {
  return new Promise((resolve, reject) => {
    chrome.management.getAll((result) => {
      const err = chrome.runtime.lastError;
      err ? reject(err) : resolve(result);
    });
  });
};

const prepGroups = (groups) => {
  groups.forEach((group) => {
    if (!group.id) {
      group.id = uuidv4();
    }
  });
  return groups;
};

const extensionScheme = [
  {keys: ['id', 'name', 'description', 'version', 'type', 'optionsUrl', 'installType'], type: 'string'},
  {keys: ['shortName', 'versionName', 'disabledReason', 'appLaunchUrl', 'homepageUrl', 'updateUrl', 'launchType'], type: 'string', optional: true},
  {keys: ['mayDisable', 'enabled', 'offlineEnabled'], type: 'boolean'},
  {keys: ['mayEnable', 'isApp'], type: 'boolean', optional: true},
  {keys: ['icons', 'permissions', 'hostPermissions'], type: 'array'},
  {keys: ['availableLaunchTypes'], type: 'array', optional: true},
];
const prepExtension = (extension) => {
  extensionScheme.forEach(item => {
    item.keys.forEach(key => {
      if (!item.optional || (extension[key] !== undefined && extension[key] !== null)) {
        if (item.type === 'string' && typeof extension[key] !== 'string') {
          extension[key] = '';
        }
        if (item.type === 'boolean' && typeof extension[key] !== 'boolean') {
          extension[key] = !!extension[key];
        }
        if (item.type === 'array' && !Array.isArray(extension[key])) {
          extension[key] = [];
        }
      }
    });
  });
  return extension;
};

export default RootStore;