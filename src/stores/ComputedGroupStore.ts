import type RootStore from './RootStore';
import type ExtensionStore from './ExtensionStore';
import extensionTypes from '../tools/extensionTypes';
import getLogger from '../tools/getLogger';
import toCameCase from '../tools/toCameCase';

const logger = getLogger('ComputedGroupStore');

class ComputedGroupStore {
  isLoading = false;

  constructor(
    private readonly rootStore: RootStore,
    readonly id: string,
    readonly computed: string,
  ) {}

  get name() {
    return (
      chrome.i18n.getMessage(`${toCameCase(this.computed)}Type`) ||
      chrome.i18n.getMessage('unknownType')
    );
  }

  get isChecked() {
    return this.extensions.every((extension) => extension.enabled);
  }

  get extensions(): ExtensionStore[] {
    if (this.computed === 'unknown') {
      return this.rootStore.extensionsWithoutGroup.filter(
        (extension) => !extensionTypes.includes(extension.type as (typeof extensionTypes)[number]),
      );
    }
    return this.rootStore.extensionsWithoutGroup.filter(
      (extension) => extension.type === this.computed,
    );
  }

  subscribe = (listener: () => void) => this.rootStore.subscribe(listener);

  getVersion = () => this.rootStore.getVersion();

  async setEnabled(enabled: boolean) {
    this.isLoading = true;
    this.rootStore.notify();
    try {
      await Promise.all(this.extensions.map((extension) => extension.setEnabled(enabled)));
    } catch (error) {
      logger.error('setEnabled error', error);
    }
    this.isLoading = false;
    this.rootStore.notify();
  }

  setName(_name: string) {}

  insertItem(_id: string, _previousId: string | null, _nextId: string | null) {}

  removeItem(_id: string) {}

  removeIfEmpty() {}

  save() {}
}

export default ComputedGroupStore;
