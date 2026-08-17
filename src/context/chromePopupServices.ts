import type {ComputedGroupOrder, StoredUserGroup, UserGroupSnapshot} from './PopupContext';

export interface PopupEventHandlers {
  extensionChanged(extension: chrome.management.ExtensionInfo): void;
  extensionRemoved(id: string): void;
  groupsChanged(groups: StoredUserGroup[]): void;
  computedOrderChanged(computedOrder: ComputedGroupOrder): void;
}

export interface PopupServices {
  selfId: string;
  getExtensions(): Promise<chrome.management.ExtensionInfo[]>;
  loadGroups(): Promise<StoredUserGroup[]>;
  loadComputedOrder(): Promise<ComputedGroupOrder>;
  saveGroups(groups: UserGroupSnapshot[], computedOrder: ComputedGroupOrder): Promise<void>;
  setExtensionEnabled(id: string, enabled: boolean): Promise<void>;
  uninstallExtension(id: string): Promise<void>;
  launchExtension(id: string): Promise<void>;
  openExtensionOptions(url: string): Promise<void>;
  subscribe(handlers: PopupEventHandlers): () => void;
}

const chromePopupServices: PopupServices = {
  get selfId() {
    return chrome.runtime.id;
  },
  getExtensions: () => chrome.management.getAll(),
  loadGroups: () => chrome.storage.sync.get({list: []}).then(({list}) => list as StoredUserGroup[]),
  loadComputedOrder: () =>
    chrome.storage.sync
      .get({computedOrder: {}})
      .then(({computedOrder}) => computedOrder as ComputedGroupOrder),
  saveGroups: (list, computedOrder) => chrome.storage.sync.set({list, computedOrder}),
  setExtensionEnabled: (id, enabled) => chrome.management.setEnabled(id, enabled),
  uninstallExtension: (id) => chrome.management.uninstall(id, {showConfirmDialog: true}),
  launchExtension: (id) => chrome.management.launchApp(id),
  openExtensionOptions: (url) => chrome.tabs.create({url}).then(() => undefined),
  subscribe: (handlers) => {
    const handleStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === 'sync' && changes.list) {
        handlers.groupsChanged((changes.list.newValue ?? []) as StoredUserGroup[]);
      }
      if (areaName === 'sync' && changes.computedOrder) {
        handlers.computedOrderChanged((changes.computedOrder.newValue ?? {}) as ComputedGroupOrder);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChanged);
    chrome.management.onInstalled.addListener(handlers.extensionChanged);
    chrome.management.onUninstalled.addListener(handlers.extensionRemoved);
    chrome.management.onEnabled.addListener(handlers.extensionChanged);
    chrome.management.onDisabled.addListener(handlers.extensionChanged);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChanged);
      chrome.management.onInstalled.removeListener(handlers.extensionChanged);
      chrome.management.onUninstalled.removeListener(handlers.extensionRemoved);
      chrome.management.onEnabled.removeListener(handlers.extensionChanged);
      chrome.management.onDisabled.removeListener(handlers.extensionChanged);
    };
  },
};

export default chromePopupServices;
