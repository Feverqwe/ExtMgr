import {types, resolveIdentifier, getParent} from "mobx-state-tree";
import extensionModel from "./extension";

const groupModel = types.model('group', {
  isLoading: types.optional(types.boolean, false),
  computed: types.maybe(types.string),
  name: types.string,
  ids: types.optional(types.array(types.string), [])
}).actions(self => {
  return {
    assign(obj) {
      Object.assign(self, obj);
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
    handleToggle(e) {
      e.stopPropagation();
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