import {flow, getRoot, isAlive, types} from "mobx-state-tree";
import getLogger from "../tools/getLogger";

const logger = getLogger('GroupStore');

/**
 * @typedef {Object} GroupStore
 * @property {string} id
 * @property {boolean} [isLoading]
 * @property {string} name
 * @property {string[]} ids
 * @property {function:Promise} setEnabled
 * @property {function} setName
 * @property {function} insertItem
 * @property {function} removeItem
 * @property {*} isChecked
 * @property {*} extensions
 * @property {function} removeIfEmpty
 * @property {function} save
 * @property {function} getSnapshot
 */
const GroupStore = types.model('GroupStore', {
  id: types.identifier,
  isLoading: types.optional(types.boolean, false),
  name: types.string,
  ids: types.array(types.string)
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
    }),
    setName(name) {
      self.name = name;
    },
    insertItem(id, prevId, nextId) {
      const ids = self.ids.slice(0);

      if (prevId) {
        const pos = ids.indexOf(prevId);
        if (pos !== -1) {
          ids.splice(pos + 1, 0, id);
        }
      } else
      if (nextId) {
        const pos = ids.indexOf(nextId);
        if (pos !== -1) {
          ids.splice(pos, 0, id);
        }
      } else {
        ids.push(id);
      }

      self.ids = ids;
    },
    removeItem(id) {
      const ids = self.ids.slice(0);

      const pos = ids.indexOf(id);
      if (pos !== -1) {
        ids.splice(pos, 1);
        self.ids = ids;
      }
    }
  };
}).views(self => {
  return {
    get isChecked() {
      return self.extensions.every(extension => extension.enabled);
    },
    get extensions() {
      /**@type RootStore*/const rootStore = getRoot(self);
      return self.ids.reduce((result, id) => {
        const extension = rootStore.extensions.get(id);
        if (extension) {
          result.push(extension);
        }
        return result;
      }, []);
    },
    removeIfEmpty() {
      if (!self.extensions.length) {
        /**@type RootStore*/const rootStore = getRoot(self);
        rootStore.removeGroupById(self.id);
      }
    },
    save() {
      /**@type RootStore*/const rootStore = getRoot(self);
      return rootStore.saveGroups();
    },
    getSnapshot() {
      return {
        id: self.id,
        name: self.name,
        ids: self.ids
      };
    }
  };
});

export default GroupStore;