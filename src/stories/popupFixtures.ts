import type {PopupInitialData} from '../context/PopupContext';
import type {PopupServices} from '../context/chromePopupServices';

export const createExtension = (
  id: string,
  name: string,
  enabled = true,
): chrome.management.ExtensionInfo => ({
  id,
  name,
  shortName: name,
  description: `${name} description`,
  version: '1.0.0',
  mayDisable: true,
  enabled,
  isApp: false,
  type: 'extension',
  offlineEnabled: true,
  optionsUrl: '',
  icons: [],
  permissions: [],
  hostPermissions: [],
  installType: 'normal',
  availableLaunchTypes: [],
});

export const popupStoryServices: PopupServices = {
  selfId: 'extmgr-story',
  getExtensions: () => Promise.resolve([]),
  loadGroups: () => Promise.resolve([]),
  saveGroups: () => Promise.resolve(),
  setExtensionEnabled: () => Promise.resolve(),
  uninstallExtension: () => Promise.resolve(),
  launchExtension: () => Promise.resolve(),
  openExtensionOptions: () => Promise.resolve(),
  subscribe: () => () => undefined,
};

export const createPopupStoryData = (secondExtensionEnabled = false): PopupInitialData => ({
  groups: [
    {id: 'development', name: 'Development', ids: ['devtools']},
    {id: 'writing', name: 'Writing', ids: ['formatter']},
  ],
  extensions: {
    devtools: createExtension('devtools', 'Developer Tools'),
    formatter: createExtension('formatter', 'Page Formatter', secondExtensionEnabled),
  },
});
