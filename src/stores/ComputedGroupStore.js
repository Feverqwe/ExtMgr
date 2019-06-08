import {flow, getRoot, isAlive, types} from "mobx-state-tree";
import getLogger from "../tools/getLogger";
import toCameCase from "../tools/toCameCase";
import extensionTypes from "../tools/extensionTypes";

const logger = getLogger('ComputedGroupStore');

/**
 * @typedef {Object} ComputedGroupStore
 * @property {string} id
 * @property {boolean} [isLoading]
 * @property {string} computed
 * @property {function:Promise} setEnabled
 * @property {*} name
 * @property {*} isChecked
 * @property {*} extensions
 * @property {function} setName
 * @property {function} insertItem
 * @property {function} removeItem
 * @property {function} removeIfEmpty
 * @property {function} save
 */
const ComputedGroupStore = types.model('ComputedGroupStore', {
  id: types.identifier,
  isLoading: types.optional(types.boolean, false),
  computed: types.string,
}).actions(self => {
  return {
    setEnabled: flow(function* (enabled) {
      self.isLoading = true;
      try {
        yield Promise.all(self.extensions.map((extension) => {
          return extension.setEnabled(enabled);
        }));
      } catch (err) {
        logger.error('setEnabled error', err);
      }
      if (isAlive(self)) {
        self.isLoading = false;
      }
    })
  };
}).views(self => {
  return {
    get name() {
      return chrome.i18n.getMessage(toCameCase(self.computed) + 'Type') || chrome.i18n.getMessage('unknownType');
    },
    get isChecked() {
      return self.extensions.every(extension => extension.enabled);
    },
    get extensions() {
      const type = self.computed;
      /**@type RootStore*/const rootStore = getRoot(self);
      const extensions = rootStore.extensionsWithoutGroup;
      if (type === 'unknown') {
        return extensions.filter(extension => extensionTypes.indexOf(extension.type) === -1);
      } else {
        return extensions.filter(extension => extension.type === type);
      }
    },
    setName(name) {

    },
    insertItem(id, prevId, nextId) {

    },
    removeItem(id) {

    },
    removeIfEmpty() {

    },
    save() {

    }
  };
});

export default ComputedGroupStore;