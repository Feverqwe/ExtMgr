import {types, resolveIdentifier, destroy} from 'mobx-state-tree';
import groupModel from "./group";
import promisifyApi from "../../tools/promisifyApi";
import extensionModel from "./extension";
import toCameCase from "../../tools/toCameCase";

const debug = require('debug')('popup');
const promiseLimit = require('promise-limit');
const oneLimit = promiseLimit(1);
const extensionTypes = ['extension', 'hosted_app', 'packaged_app', 'legacy_packaged_app', 'theme'];

const storeModel = types.model('storeModel', {
  isLoading: types.optional(types.boolean, false),
  groups: types.array(groupModel),
  extensions: types.map(extensionModel),
}).actions(self => {
  return {
    unshiftGroup(...group) {
      self.groups.unshift(...group);
    },
    setExtension(extension) {
      self.extensions.set(extension.id, extension);
    },
    removeExtension(id) {
      const extension = self.extensions.get(id);
      if (extension) {
        destroy(extension);
      }
    },
    removeGroup(id) {
      const group = self.getGroupById(id);
      if (group) {
        destroy(group);
      }
    },
    syncUserGroups(userGroups) {
      const groups = self.groups.filter(group => group.computed);
      groups.unshift(...userGroups);
      self.groups = groups;
    },
    assign(obj) {
      Object.assign(self, obj);
    }
  };
}).views(self => {
  const handleInstalledListener = extension => {
    self.setExtension(extension);
  };
  const handleUninstalledListener = id => {
    self.removeExtension(id);
  };
  const handleEnabled = extension => {
    self.setExtension(extension);
  };
  const handleDisabled = extension => {
    self.setExtension(extension);
  };
  const handleStorageChanged = (changes, areaName) => {
    switch (areaName) {
      case 'sync': {
        if (changes.list) {
          self.syncUserGroups(changes.list.newValue);
        }
        break;
      }
    }
  };

  return {
    getGroupById(id) {
      return resolveIdentifier(groupModel, self, id);
    },
    getUserGroups() {
      return self.groups.filter(group => {
        return !group.computed;
      });
    },
    getExtensionsWithoutGroup() {
      const groupExtensionIds = [];
      self.getUserGroups().forEach(group => {
        groupExtensionIds.push(...group.getIds());
      });
      return Array.from(self.extensions.values()).filter(extensoin => groupExtensionIds.indexOf(extensoin.id) === -1);
    },
    getExtensionsByType(type) {
      const extensions = self.getExtensionsWithoutGroup();
      if (type === 'unknown') {
        return extensions.filter(extension => extensionTypes.indexOf(extension.type) === -1);
      } else {
        return extensions.filter(extension => extension.type === type);
      }
    },
    saveGroups() {
      return oneLimit(() => {
        const userGroups = self.getUserGroups();
        const list = JSON.parse(JSON.stringify(userGroups));
        list.forEach(group => {
          group.isLoading = undefined;
          group.computed = undefined;
        });
        return promisifyApi('chrome.storage.sync.set')({list: list});
      });
    },
    afterCreate() {
      self.assign({isLoading: true});

      const computedGroups = [...extensionTypes, 'unknown'].map(type => {
        return groupModel.create({
          computed: type,
          name: chrome.i18n.getMessage(toCameCase(type) + 'Type') || chrome.i18n.getMessage('unknownType'),
        });
      });
      self.unshiftGroup(...computedGroups);

      return Promise.all([
        promisifyApi('chrome.storage.sync.get')({list: []}).then(storage => {
          chrome.storage.onChanged.addListener(handleStorageChanged);

          self.unshiftGroup(...storage.list);
        }),
        promisifyApi('chrome.management.getAll')().then(result => {
          chrome.management.onInstalled.addListener(handleInstalledListener);
          chrome.management.onUninstalled.addListener(handleUninstalledListener);
          chrome.management.onEnabled.addListener(handleEnabled);
          chrome.management.onDisabled.addListener(handleDisabled);

          result.forEach(extension => {
            if (extension.id !== chrome.runtime.id) {
              try {
                self.setExtension(extension);
              } catch (err) {
                debug('setExtension error', extension, err);
              }
            }
          });
        })
      ]).then(() => {
        self.groups.forEach(group => {
          group.removeIfEmpty();
        });
      }).catch(err => {
        debug('Loading error', err);
      }).then(() => {
        self.assign({isLoading: false});
      });
    }
  };
});

export default storeModel;