import {types, resolveIdentifier} from "mobx-state-tree";
import extensionModel from "./extension";

const sectionModel = types.model('section', {
  name: types.string,
  ids: types.array(types.string)
}).actions(self => {
  return {

  };
}).views(self => {
  return {
    get isChecked() {
      return self.getExtensions().every(extension => extension.enabled);
    },
    getIds() {
      return self.ids.slice(0);
    },
    hasId(id) {
      return self.ids.indexOf(id) !== -1;
    },
    getExtensions() {
      return self.ids.map(id => resolveIdentifier(extensionModel, self, id)).filter(a => a);
    },
    handleToggle(e) {
      e.preventDefault();
    }
  };
});

export default sectionModel;