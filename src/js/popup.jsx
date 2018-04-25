import '../css/popup.css';
import {types, resolveIdentifier} from 'mobx-state-tree';
import {observer} from 'mobx-react';
import ReactDOM from 'react-dom';
import React from 'react';
import sectionModel from "./model/section";
import promisifyApi from "../tools/promisifyApi";
import extensionModel from "./model/extension";

const debug = require('debug')('popup');
const emptyIcon = require('../img/empty.svg');

const extensionTypeName = {
  extension: 'Extensions',
  hosted_app: 'Hosted apps',
  packaged_app: 'Packaged apps',
  legacy_packaged_app: 'Legacy packaged apps',
  theme: 'Themes'
};

const storeModel = types.model('storeModel', {
  state: types.optional(types.string, 'idle'), // idle, loading, done
  sections: types.optional(types.array(sectionModel), []),
  extensions: types.optional(types.array(extensionModel), [])
}).actions(self => {
  return {
    addSection(section) {
      self.sections.push(section);
    },
    assign(obj) {
      Object.assign(self, obj);
    }
  };
}).views(self => {
  return {
    hasSectionExtId(id) {
      return self.sections.some(section => section.hasId(id));
    },
    excludeSectionIds(ids) {
      return ids.filter(id => !self.hasSectionExtId(id));
    },
    getExtensionsByType(type) {
      return self.extensions.filter(extension => extension.type === type);
    },
    afterCreate() {
      self.assign({state: 'loading'});
      return Promise.all([
        promisifyApi('chrome.storage.sync.get')({list: []}).then(storage => {
          self.assign({
            sections: storage.list
          });
        }),
        promisifyApi('chrome.management.getAll')().then(result => {
          self.assign({
            extensions: result
          });
        })
      ]).then(() => {
        ['extension', 'hosted_app', 'packaged_app', 'legacy_packaged_app', 'theme'].forEach(type => {
          const section = sectionModel.create({
            computed: type,
            name: extensionTypeName[type]
          });
          self.addSection(section);
        });
      }).catch(err => {
        debug('Loading error', err);
      }).then(() => {
        self.assign({state: 'done'});
      });
    }
  };
});

@observer class Popup extends React.Component {
  constructor() {
    super();
  }
  render() {
    const store = this.props.store;
    const sections = store.sections.map(section => {
      return (
        <Section key={section.name} section={section}/>
      );
    });

    return (
      <div className="list">{sections}</div>
    );
  }
}

@observer class Section extends React.Component {
  constructor() {
    super();

    this.handleEdit = this.handleEdit.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }
  handleEdit(e) {
    e.preventDefault();
  }
  handleSave(e) {
    e.preventDefault();
  }
  render() {
    const section = this.props.section;
    const computed = !!section.computed;
    const extensions = section.getExtensions().map(extension => {
      return <Extension key={extension.id} extension={extension}/>
    });

    if (computed && !extensions.length) {
      return null;
    }

    const actions = [];
    if (!computed) {
      actions.push(
        <a key={'edit'} title={chrome.i18n.getMessage('edit')} href={'#edit'} onClick={this.handleEdit} className="btn edit"/>
      );
      actions.push(
        <a key={'save'} title={chrome.i18n.getMessage('save')} href={'#save'} onClick={this.handleSave} className="btn save"/>
      );
    }

    return [
      <div key={section.name} className="row group">
        <div className="cell switch">
          <input type="checkbox" checked={section.isChecked} onChange={section.handleToggle}/>
        </div>
        <div className="cell name">
          <span>{section.name}</span>
        </div>
        <div className="cell action">{actions}</div>
      </div>,
      ...extensions
    ];
  }
}

@observer class Extension extends React.Component {
  constructor() {
    super();
  }
  render() {
    /**@type Extension*/
    const extension = this.props.extension;

    const actions = [];
    if (extension.launchType) {
      actions.push(
        <a key={'launch'} title={chrome.i18n.getMessage('launch')}
           href={'#launch'} className="btn launch" onClick={extension.handleLaunch}/>
      );
    }
    if (extension.optionsUrl) {
      actions.push(
        <a key={'options'} title={chrome.i18n.getMessage('options')}
           href={'#options'} className="btn options" onClick={extension.handleOptions}/>
      );
    }
    actions.push(
      <a key={'uninstall'} title={chrome.i18n.getMessage('uninstall')}
         href={'#uninstall'} className="btn remove" onClick={extension.handleUninstall}/>
    );

    return (
      <div className="row" onClick={extension.handleToggle}>
        <div className="cell switch">
          <input type="checkbox" checked={extension.enabled} disabled={extension.mayDisable}/>
        </div>
        <div className="cell icon" title={chrome.i18n.getMessage('move')}>
          <img src={extension.getIcon(19) || emptyIcon}/>
        </div>
        <div className="cell name">
          <span title={extension.name}>{extension.name}</span>
        </div>
        <div className="cell action">{actions}</div>
      </div>
    );
  }
}

export default ReactDOM.render(<Popup store={storeModel.create()}/>, document.getElementById('root'));