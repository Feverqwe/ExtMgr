import type RootStore from './RootStore';
import getLogger from '../tools/getLogger';

const logger = getLogger('ExtensionStore');

const selectIcon = (icons: readonly chrome.management.IconInfo[], size: number) => {
  const sortedIcons = icons.slice().sort((a, b) => (a.size > b.size ? -1 : 1));
  return sortedIcons.filter((item) => item.size >= size).pop()?.url ?? sortedIcons[0]?.url;
};

class ExtensionStore {
  isLoading = false;

  constructor(
    private readonly rootStore: RootStore,
    private readonly data: chrome.management.ExtensionInfo,
  ) {}

  get id() {
    return this.data.id;
  }

  get name() {
    return this.data.name;
  }

  get enabled() {
    return this.data.enabled;
  }

  get mayDisable() {
    return this.data.mayDisable;
  }

  get type() {
    return this.data.type;
  }

  get optionsUrl() {
    return this.data.optionsUrl;
  }

  get launchType() {
    return this.data.launchType;
  }

  get icon19() {
    return selectIcon(this.data.icons ?? [], 19);
  }

  getIcon(size: number) {
    return selectIcon(this.data.icons ?? [], size);
  }

  get descriptionTitle() {
    const result = [`Name: ${this.name}`, `ID: ${this.id}`];

    if (this.data.versionName) {
      result.push(`Version: ${this.data.versionName} (${this.data.version})`);
    } else {
      result.push(`Version: ${this.data.version}`);
    }

    result.push(`Type: ${this.type}`);

    if (this.data.homepageUrl) {
      result.push(`Homepage: ${this.data.homepageUrl}`);
    }
    if (this.data.updateUrl) {
      result.push(`Update url: ${this.data.updateUrl}`);
    }

    result.push(`Offline enabled: ${this.data.offlineEnabled}`);

    if (this.data.appLaunchUrl) {
      result.push(`App launch url: ${this.data.appLaunchUrl}`);
    }

    result.push(`Permissions: ${this.data.permissions?.join(', ') ?? ''}`);
    result.push(`Host permissions: ${this.data.hostPermissions?.join(', ') ?? ''}`);
    result.push(`Install type: ${this.data.installType}`);

    if (this.data.launchType) {
      result.push(`Launch type: ${this.data.launchType}`);
    }

    if (!this.enabled && this.data.disabledReason) {
      result.push(`Disabled reason: ${this.data.disabledReason}`);
    }

    result.push(`Short name: ${this.data.shortName}`);
    result.push(`Description: ${this.data.description}`);

    return result.join('\n');
  }

  subscribe = (listener: () => void) => this.rootStore.subscribe(listener);

  getVersion = () => this.rootStore.getVersion();

  async uninstall() {
    this.setLoading(true);
    try {
      await chromeManagementUninstall(this.id, {
        showConfirmDialog: true,
      });
    } catch (error) {
      logger.error('uninstall error', error);
    }
    this.setLoading(false);
  }

  async setEnabled(enabled: boolean) {
    this.setLoading(true);
    try {
      await chromeManagementSetEnabled(this.id, enabled);
    } catch (error) {
      logger.error('setEnabled error', error);
    }
    this.setLoading(false);
  }

  launch() {
    chrome.management.launchApp(this.id);
  }

  openOptions() {
    chrome.tabs.create({url: this.optionsUrl});
  }

  private setLoading(isLoading: boolean) {
    this.isLoading = isLoading;
    this.rootStore.notify();
  }
}

const chromeManagementSetEnabled = (id: string, enabled: boolean) => {
  return new Promise<void>((resolve, reject) => {
    chrome.management.setEnabled(id, enabled, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

const chromeManagementUninstall = (id: string, options: chrome.management.UninstallOptions) => {
  return new Promise<void>((resolve, reject) => {
    chrome.management.uninstall(id, options, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

export default ExtensionStore;
