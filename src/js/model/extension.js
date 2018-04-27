import {types, isAlive} from "mobx-state-tree";
import promisifyApi from "../../tools/promisifyApi";

/**
 * @typedef {Object} IconInfo
 * @property {number} size
 * @property {string} url
 */

/**
 * @typedef {{}} Extension
 * @property {boolean} isLoading
 * @property {string} id
 * @property {string} name
 * @property {string} shortName
 * @property {string} description
 * @property {string} version
 * @property {string} [versionName]
 * @property {boolean} mayDisable
 * @property {boolean} [mayEnable]
 * @property {boolean} enabled
 * @property {string} [disabledReason] // "unknown" or "permissions_increase"
 * @property {boolean} isApp
 * @property {string} type // "extension", "hosted_app", "packaged_app", "legacy_packaged_app", or "theme"
 * @property {string} [appLaunchUrl]
 * @property {string} [homepageUrl]
 * @property {string} [updateUrl]
 * @property {boolean} offlineEnabled
 * @property {string} optionsUrl
 * @property {[IconInfo]} [icons]
 * @property {[string]} permissions
 * @property {[string]} hostPermissions
 * @property {string} installType // "admin", "development", "normal", "sideload", or "other"
 * @property {string} [launchType] // "OPEN_AS_REGULAR_TAB", "OPEN_AS_PINNED_TAB", "OPEN_AS_WINDOW", or "OPEN_FULL_SCREEN"
 * @property {[string]} [availableLaunchTypes]
 */

const extensionModelScheme = [
  {keys: ['id', 'name', 'description', 'version', 'type', 'optionsUrl', 'installType'], type: 'string'},
  {keys: ['shortName', 'versionName', 'disabledReason', 'appLaunchUrl', 'homepageUrl', 'updateUrl', 'launchType'], type: 'string', optional: true},
  {keys: ['mayDisable', 'enabled', 'offlineEnabled'], type: 'boolean'},
  {keys: ['mayEnable', 'isApp'], type: 'boolean', optional: true},
  {keys: ['icons', 'permissions', 'hostPermissions'], type: 'array'},
  {keys: ['availableLaunchTypes'], type: 'array', optional: true},
];

const extensionModel = types.model('extension', {
  isLoading: types.optional(types.boolean, false),
  id: types.identifier(types.string),
  name: types.string,
  shortName: types.maybe(types.string),
  description: types.string,
  version: types.string,
  versionName: types.maybe(types.string),
  mayDisable: types.boolean,
  mayEnable: types.maybe(types.boolean),
  enabled: types.boolean,
  disabledReason: types.maybe(types.string),
  isApp: types.maybe(types.boolean),
  type: types.string,
  appLaunchUrl: types.maybe(types.string),
  homepageUrl: types.maybe(types.string),
  updateUrl: types.maybe(types.string),
  offlineEnabled: types.boolean,
  optionsUrl: types.string,
  icons: types.array(types.model('iconInfo', {
    size: types.number,
    url: types.string,
  })),
  permissions: types.array(types.string),
  hostPermissions: types.array(types.string),
  installType: types.string,
  launchType: types.maybe(types.string),
  availableLaunchTypes: types.maybe(types.array(types.string)),
}).preProcessSnapshot(snapshot => {
  extensionModelScheme.forEach(item => {
    item.keys.forEach(key => {
      if (!item.optional || (snapshot[key] !== undefined && snapshot[key] !== null)) {
        if (item.type === 'string' && typeof snapshot[key] !== 'string') {
          snapshot[key] = '';
        }
        if (item.type === 'boolean' && typeof snapshot[key] !== 'boolean') {
          snapshot[key] = !!snapshot[key];
        }
        if (item.type === 'array' && !Array.isArray(snapshot[key])) {
          snapshot[key] = [];
        }
      }
    });
  });
  return snapshot;
}).actions(/**Extension*/self => {
  return {
    assign(obj) {
      Object.assign(self, obj);
    }
  };
}).views(/**Extension*/self => {
  return {
    getIcon(size) {
      const icons = self.icons.slice(0) || [];
      icons.sort((a, b) => a.size > b.size ? -1 : 1);
      let icon = icons.filter(a => a.size >= size).pop();
      if (!icon) {
        icon = icons[0];
      }
      return icon && icon.url;
    },
    getDescription() {
      const result = [];
      result.push(`Name: ${self.name}`);
      result.push(`ID: ${self.id}`);

      if (self.versionName) {
        result.push(`Version: ${self.versionName} (${self.version})`);
      } else {
        result.push(`Version: ${self.version}`);
      }

      result.push(`Type: ${self.type}`);

      if (self.homepageUrl) {
        result.push(`Homepage: ${self.homepageUrl}`);
      }
      if (self.updateUrl) {
        result.push(`Update url: ${self.updateUrl}`);
      }

      result.push(`Offline enabled: ${self.offlineEnabled}`);

      if (self.appLaunchUrl) {
        result.push(`App launch url: ${self.appLaunchUrl}`);
      }

      result.push(`Permissions: ${self.permissions.join(', ')}`);
      result.push(`Host permissions: ${self.hostPermissions.join(', ')}`);
      result.push(`Install type: ${self.installType}`);

      if (self.launchType) {
        result.push(`Launch type: ${self.launchType}`);
      }

      if (!self.enabled && self.disabledReason) {
        result.push(`Disabled reason: ${self.disabledReason}`);
      }

      result.push(`Short name: ${self.shortName}`);
      result.push(`Description: ${self.description}`);

      return result.join('\n');
    },
    changeEnabled(newState) {
      self.assign({isLoading: true});
      return promisifyApi('chrome.management.setEnabled')(self.id, newState).catch(err => {
        console.error('setEnabled error', err);
      }).then(() => {
        self.assign({
          isLoading: false,
          enabled: newState,
        });
      });
    },
    handleToggle(e) {
      e.preventDefault();
      const newState = !self.enabled;
      return self.changeEnabled(newState);
    },
    handleLaunch(e) {
      e.preventDefault();
      chrome.management.launchApp(self.id);
    },
    handleOptions(e) {
      e.preventDefault();
      chrome.tabs.create({
        url: self.optionsUrl
      });
    },
    handleUninstall(e) {
      e.preventDefault();
      self.assign({isLoading: true});
      promisifyApi('chrome.management.uninstall')(self.id, {
        showConfirmDialog: true
      }).catch(err => {
        console.error('uninstall error', err);
      }).then(() => {
        if (isAlive(self)) {
          self.assign({isLoading: false});
        }
      });
    }
  };
});

export default extensionModel;