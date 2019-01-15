import {types, resolveIdentifier, getParent, destroy} from "mobx-state-tree";
import extensionModel from "./extension";

const uuidv4 = require('uuid/v4');

const groupModel = types.model('group', {
  id: types.identifier,
  isLoading: types.optional(types.boolean, false),
  computed: types.maybe(types.string),
  name: types.string,
  ids: types.array(types.string)
}).preProcessSnapshot(snapshot => {
  if (!snapshot.id) {
    snapshot.id = uuidv4();
  }
  return snapshot;
}).actions(self => {
  return {
    assign(obj) {
      Object.assign(self, obj);
    },
    setIds(ids) {
      self.ids = ids;
    },
    setName(name) {
      self.name = name;
    }
  };
}).views(self => {
  return {
    get isChecked() {
      return self.getExtensions().every(extension => extension.enabled);
    },
    getIds() {
      if (self.computed) {
        const store = getParent(self, 2);
        return store.getExtensionsByType(self.computed).map(extension => extension.id);
      } else {
        return self.ids;
      }
    },
    getExtensions() {
      if (self.computed) {
        const store = getParent(self, 2);
        return store.getExtensionsByType(self.computed);
      } else {
        return self.ids.map(id => resolveIdentifier(extensionModel, self, id)).filter(a => a);
      }
    },
    insertItem(id, prevId, nextId) {
      if (self.computed) return;

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

      self.setIds(ids);
    },
    removeItem(id) {
      if (self.computed) return;

      const ids = self.ids.slice(0);

      const pos = ids.indexOf(id);
      if (pos !== -1) {
        ids.splice(pos, 1);
      }

      self.setIds(ids);
    },
    removeIfEmpty() {
      if (self.computed) return;

      if (!self.getExtensions().length) {
        const store = getParent(self, 2);
        store.removeGroup(self.id);
      }
    },
    save() {
      const store = getParent(self, 2);
      return store.saveGroups();
    },
    handleToggle(e) {
      e.preventDefault();
      const newState = !self.isChecked;
      self.assign({isLoading: true});
      return Promise.all(self.getExtensions().map(extension => {
        return extension.changeEnabled(newState);
      })).catch(err => {
        console.error('handleToggle error', err);
      }).then(() => {
        self.assign({isLoading: false});
      });
    }
  };
});

export default groupModel;