import {flow, getRoot, Instance, isAlive, types} from 'mobx-state-tree';
import type {ExtensionStoreInstance} from './ExtensionStore';
import extensionTypes from '../tools/extensionTypes';
import getLogger from '../tools/getLogger';
import toCameCase from '../tools/toCameCase';

interface ComputedGroupRootStore {
  extensionsWithoutGroup: ExtensionStoreInstance[];
}

const logger = getLogger('ComputedGroupStore');

const ComputedGroupStore = types
  .model('ComputedGroupStore', {
    id: types.identifier,
    isLoading: types.optional(types.boolean, false),
    computed: types.string,
  })
  .views((self) => ({
    get name() {
      return (
        chrome.i18n.getMessage(`${toCameCase(self.computed)}Type`) ||
        chrome.i18n.getMessage('unknownType')
      );
    },
    get isChecked() {
      return this.extensions.every((extension) => extension.enabled);
    },
    get extensions(): ExtensionStoreInstance[] {
      const rootStore = getRoot(self) as unknown as ComputedGroupRootStore;
      if (self.computed === 'unknown') {
        return rootStore.extensionsWithoutGroup.filter(
          (extension) =>
            !extensionTypes.includes(extension.type as (typeof extensionTypes)[number]),
        );
      }
      return rootStore.extensionsWithoutGroup.filter(
        (extension) => extension.type === self.computed,
      );
    },
    setName(_name: string) {},
    insertItem(_id: string, _previousId: string | null, _nextId: string | null) {},
    removeItem(_id: string) {},
    removeIfEmpty() {},
    save() {},
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
  }));

export type ComputedGroupStoreInstance = Instance<typeof ComputedGroupStore>;

export default ComputedGroupStore;
