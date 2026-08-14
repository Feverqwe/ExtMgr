import promiseLimit from 'promise-limit';
import uuidv4 from 'uuid/v4';
import ComputedGroupStore from './ComputedGroupStore';
import ExtensionStore from './ExtensionStore';
import GroupStore, {type UserGroupSnapshot} from './GroupStore';
import extensionTypes from '../tools/extensionTypes';
import getLogger from '../tools/getLogger';
import storageGet from '../tools/storageGet';
import storageSet from '../tools/storageSet';

const logger = getLogger('rootStore');
const oneLimit = promiseLimit(1);

type RootStoreState = 'idle' | 'pending' | 'done' | 'error';
type Listener = () => void;
type StoredUserGroup = Omit<UserGroupSnapshot, 'id'> & {id?: string};

interface RootStoreData {
  groups?: UserGroupSnapshot[];
  extensions?: Record<string, chrome.management.ExtensionInfo>;
}

class RootStore {
  state: RootStoreState = 'idle';
  groups: GroupStore[] = [];
  computedGroups: ComputedGroupStore[] = [];
  extensions = new Map<string, ExtensionStore>();

  private version = 0;
  private readonly listeners = new Set<Listener>();
  private listenersRegistered = false;
  private destroyed = false;

  constructor(data: RootStoreData = {}) {
    this.groups = (data.groups ?? []).map(
      (group) => new GroupStore(this, group.id, group.name, group.ids),
    );
    Object.values(data.extensions ?? {}).forEach((extension) =>
      this.setExtension(extension, false),
    );
  }

  get extensionsWithoutGroup(): ExtensionStore[] {
    const usedIds = new Set<string>();
    this.groups.forEach((group) => group.ids.forEach((id) => usedIds.add(id)));
    return Array.from(this.extensions.values()).filter((extension) => !usedIds.has(extension.id));
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = () => this.version;

  notify() {
    if (this.destroyed) {
      return;
    }
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  getGroupById(id: string) {
    return (
      this.groups.find((group) => group.id === id) ??
      this.computedGroups.find((group) => group.id === id)
    );
  }

  syncUserGroups(userGroups: StoredUserGroup[]) {
    this.groups = userGroups.map(
      (group) => new GroupStore(this, group.id || uuidv4(), group.name, group.ids),
    );
    this.notify();
  }

  createGroup(group: {name: string; ids: string[]}) {
    this.groups.unshift(new GroupStore(this, uuidv4(), group.name, group.ids));
    this.notify();
  }

  removeGroupById(id: string) {
    const position = this.groups.findIndex((group) => group.id === id);
    if (position !== -1) {
      this.groups.splice(position, 1);
      this.groups = this.groups.filter((group) => group.extensions.length > 0);
      this.notify();
    }
  }

  setExtension(extension: chrome.management.ExtensionInfo, shouldNotify = true) {
    try {
      this.extensions.set(extension.id, new ExtensionStore(this, extension));
      if (shouldNotify) {
        this.notify();
      }
    } catch (error) {
      logger.error('set extension error', extension, error);
    }
  }

  removeExtensionById(id: string) {
    if (this.extensions.delete(id)) {
      this.notify();
    }
  }

  async init() {
    if (this.state === 'pending' || this.state === 'done') {
      return;
    }

    this.destroyed = false;
    this.state = 'pending';
    this.notify();

    try {
      const groupsPromise = storageGet<{list: StoredUserGroup[]}>({list: []}, 'sync').then(
        ({list}) => list,
      );
      const [userGroups, extensions] = await Promise.all([groupsPromise, chromeManagementGetAll()]);

      if (this.destroyed) {
        return;
      }

      extensions.forEach((extension) => {
        if (extension.id !== chrome.runtime.id) {
          this.setExtension(extension, false);
        }
      });
      this.groups = userGroups.map(
        (group) => new GroupStore(this, group.id || uuidv4(), group.name, group.ids),
      );
      this.computedGroups = [...extensionTypes, 'unknown'].map(
        (type) => new ComputedGroupStore(this, `computed:${type}`, type),
      );

      this.registerListeners();
      this.state = 'done';
      this.notify();
    } catch (error) {
      logger.error('init error', error);
      if (!this.destroyed) {
        this.state = 'error';
        this.notify();
      }
    }
  }

  saveGroups() {
    return oneLimit(() => {
      const list = this.groups.map((group) => group.getSnapshot());
      return storageSet({list}, 'sync');
    });
  }

  initListeners() {
    this.registerListeners();
  }

  destroy() {
    this.destroyed = true;
    if (this.listenersRegistered) {
      chrome.storage.onChanged.removeListener(this.handleStorageChanged);
      chrome.management.onInstalled.removeListener(this.handleInstalled);
      chrome.management.onUninstalled.removeListener(this.handleUninstalled);
      chrome.management.onEnabled.removeListener(this.handleInstalled);
      chrome.management.onDisabled.removeListener(this.handleInstalled);
      this.listenersRegistered = false;
    }
    this.listeners.clear();
  }

  private readonly handleInstalled = (extension: chrome.management.ExtensionInfo) => {
    this.setExtension(extension);
  };

  private readonly handleUninstalled = (id: string) => {
    this.removeExtensionById(id);
  };

  private readonly handleStorageChanged = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName === 'sync' && changes.list) {
      this.syncUserGroups((changes.list.newValue ?? []) as StoredUserGroup[]);
    }
  };

  private registerListeners() {
    if (this.listenersRegistered) {
      return;
    }
    chrome.storage.onChanged.addListener(this.handleStorageChanged);
    chrome.management.onInstalled.addListener(this.handleInstalled);
    chrome.management.onUninstalled.addListener(this.handleUninstalled);
    chrome.management.onEnabled.addListener(this.handleInstalled);
    chrome.management.onDisabled.addListener(this.handleInstalled);
    this.listenersRegistered = true;
  }
}

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

export default RootStore;
