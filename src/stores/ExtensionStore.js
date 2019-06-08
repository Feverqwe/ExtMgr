import {flow, isAlive, types} from "mobx-state-tree";
import getLogger from "../tools/getLogger";

const logger = getLogger('ExtensionStore');

/**
 * @typedef {Object} ExtensionStore
 * @property {boolean} [isLoading]
 * @property {string} id
 * @property {string} name
 * @property {string|undefined} shortName
 * @property {string} description
 * @property {string} version
 * @property {string|undefined} versionName
 * @property {boolean} mayDisable
 * @property {boolean|undefined} mayEnable
 * @property {boolean} enabled
 * @property {string|undefined} disabledReason
 * @property {boolean|undefined} isApp
 * @property {string} type
 * @property {string|undefined} appLaunchUrl
 * @property {string|undefined} homepageUrl
 * @property {string|undefined} updateUrl
 * @property {boolean} offlineEnabled
 * @property {string} optionsUrl
 * @property {{size:number,url:string}[]} icons
 * @property {string[]} permissions
 * @property {string[]} hostPermissions
 * @property {string} installType
 * @property {string|undefined} launchType
 * @property {string[]} availableLaunchTypes
 * @property {function:Promise} uninstall
 * @property {function:Promise} setEnabled
 * @property {*} icon19
 * @property {function} getIcon
 * @property {*} descriptionTitle
 * @property {function} launch
 * @property {function} openOptions
 */
const ExtensionStore = types.model('ExtensionStore', {
  isLoading: types.optional(types.boolean, false),
  id: types.identifier,
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
  icons: types.array(types.model({
    size: types.number,
    url: types.string,
  })),
  permissions: types.array(types.string),
  hostPermissions: types.array(types.string),
  installType: types.string,
  launchType: types.maybe(types.string),
  availableLaunchTypes: types.array(types.string),
}).actions(/**Extension*/self => {
  return {
    uninstall: flow(function* () {
      self.isLoading = true;
      try {
        yield chromeManagementUninstall(self.id, {
          showConfirmDialog: true
        });
      } catch (err) {
        logger.error('uninstall error', err);
      }
      if (isAlive(self)) {
        self.isLoading = false;
      }
    }),
    setEnabled: flow(function* (enabled) {
      self.isLoading = true;
      try {
        yield chromeManagementSetEnabled(self.id, enabled);
      } catch (err) {
        logger.error('setEnabled error', err);
      }
      if (isAlive(self)) {
        self.isLoading = false;
      }
    }),
  };
}).views(/**Extension*/self => {
  return {
    get icon19() {
      return self.getIcon(19);
    },
    getIcon(size) {
      const icons = self.icons.slice(0) || [];
      icons.sort((a, b) => a.size > b.size ? -1 : 1);
      let icon = icons.filter(a => a.size >= size).pop();
      if (!icon) {
        icon = icons[0];
      }
      return icon && icon.url;
    },
    get descriptionTitle() {
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
    launch() {
      chrome.management.launchApp(self.id);
    },
    openOptions() {
      chrome.tabs.create({
        url: self.optionsUrl
      });
    }
  };
});

const chromeManagementSetEnabled = (id, enabled) => {
  return new Promise((resolve, reject) => {
    chrome.management.setEnabled(id, enabled, () => {
      const err = chrome.runtime.lastError;
      err ? reject(err) : resolve();
    });
  });
};

const chromeManagementUninstall = (id, options) => {
  return new Promise((resolve, reject) => {
    chrome.management.uninstall(id, options, () => {
      const err = chrome.runtime.lastError;
      err ? reject(err) : resolve();
    });
  });
};

export default ExtensionStore;