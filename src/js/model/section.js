import {types, resolveIdentifier, getParent} from "mobx-state-tree";
import extensionModel from "./extension";

const sectionModel = types.model('section', {
  computed: types.maybe(types.string),
  name: types.string,
  ids: types.optional(types.array(types.string), [])
}).actions(self => {
  return {

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
        return self.ids.slice(0);
      }
    },
    hasId(id) {
      return self.ids.indexOf(id) !== -1;
    },
    getExtensions() {
      return self.getIds().map(id => resolveIdentifier(extensionModel, self, id)).filter(a => a);
    },
    handleToggle(e) {
      e.preventDefault();
    }
  };
});

export default sectionModel;