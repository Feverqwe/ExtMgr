import type RootStore from './RootStore';
import type ExtensionStore from './ExtensionStore';
import getLogger from '../tools/getLogger';

const logger = getLogger('GroupStore');

export interface UserGroupSnapshot {
  id: string;
  name: string;
  ids: string[];
}

class GroupStore {
  isLoading = false;
  name: string;
  ids: string[];

  constructor(
    private readonly rootStore: RootStore,
    readonly id: string,
    name: string,
    ids: readonly string[],
  ) {
    this.name = name;
    this.ids = [...ids];
  }

  get isChecked() {
    return this.extensions.every((extension) => extension.enabled);
  }

  get extensions(): ExtensionStore[] {
    return this.ids.reduce<ExtensionStore[]>((result, id) => {
      const extension = this.rootStore.extensions.get(id);
      if (extension) {
        result.push(extension);
      }
      return result;
    }, []);
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

  setName(name: string) {
    this.name = name;
    this.rootStore.notify();
  }

  insertItem(id: string, previousId: string | null, nextId: string | null) {
    const ids = [...this.ids];

    if (previousId) {
      const position = ids.indexOf(previousId);
      if (position !== -1) {
        ids.splice(position + 1, 0, id);
      }
    } else if (nextId) {
      const position = ids.indexOf(nextId);
      if (position !== -1) {
        ids.splice(position, 0, id);
      }
    } else {
      ids.push(id);
    }

    this.ids = ids;
    this.rootStore.notify();
  }

  removeItem(id: string) {
    const position = this.ids.indexOf(id);
    if (position !== -1) {
      this.ids.splice(position, 1);
      this.rootStore.notify();
    }
  }

  removeIfEmpty() {
    if (!this.extensions.length) {
      this.rootStore.removeGroupById(this.id);
    }
  }

  save() {
    return this.rootStore.saveGroups();
  }

  getSnapshot(): UserGroupSnapshot {
    return {id: this.id, name: this.name, ids: [...this.ids]};
  }
}

export default GroupStore;
