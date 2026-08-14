import {flow, getRoot, Instance, isAlive, types} from 'mobx-state-tree';
import type {ExtensionStoreInstance} from './ExtensionStore';
import getLogger from '../tools/getLogger';

interface GroupRootStore {
  extensions: {
    get(id: string): ExtensionStoreInstance | undefined;
  };
  removeGroupById(id: string): void;
  saveGroups(): Promise<void>;
}

const logger = getLogger('GroupStore');

const GroupStore = types
  .model('GroupStore', {
    id: types.identifier,
    isLoading: types.optional(types.boolean, false),
    name: types.string,
    ids: types.array(types.string),
  })
  .views((self) => ({
    get isChecked() {
      return this.extensions.every((extension) => extension.enabled);
    },
    get extensions(): ExtensionStoreInstance[] {
      const rootStore = getRoot(self) as unknown as GroupRootStore;
      return self.ids.reduce<ExtensionStoreInstance[]>((result, id) => {
        const extension = rootStore.extensions.get(id);
        if (extension) {
          result.push(extension);
        }
        return result;
      }, []);
    },
    removeIfEmpty() {
      if (!this.extensions.length) {
        const rootStore = getRoot(self) as unknown as GroupRootStore;
        rootStore.removeGroupById(self.id);
      }
    },
    save() {
      const rootStore = getRoot(self) as unknown as GroupRootStore;
      return rootStore.saveGroups();
    },
    getSnapshot() {
      return {
        id: self.id,
        name: self.name,
        ids: self.ids.slice(),
      };
    },
  }))
  .actions((self) => ({
    setEnabled: flow(function* (enabled: boolean): Generator<Promise<void[]>, void, void> {
      self.isLoading = true;
      try {
        yield Promise.all(self.extensions.map((extension) => extension.setEnabled(enabled)));
      } catch (error) {
        logger.error('setEnabled error', error);
      }
      if (isAlive(self)) {
        self.isLoading = false;
      }
    }),
    setName(name: string) {
      self.name = name;
    },
    insertItem(id: string, previousId: string | null, nextId: string | null) {
      const ids = self.ids.slice();

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

      self.ids.replace(ids);
    },
    removeItem(id: string) {
      const position = self.ids.indexOf(id);
      if (position !== -1) {
        self.ids.splice(position, 1);
      }
    },
  }));

export type GroupStoreInstance = Instance<typeof GroupStore>;

export default GroupStore;
