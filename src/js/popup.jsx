import '../css/popup.css';
import {types, resolveIdentifier} from 'mobx-state-tree';
import ReactDOM from 'react-dom';
import React from 'react';
import sectionModel from "./model/section";
import promisifyApi from "../tools/promisifyApi";
import extensionModel from "./model/extension";

const debug = require('debug')('popup');
const emptyIcon = require('../img/empty.svg');

const storeModel = types.model('storeModel', {
  state: types.optional(types.string, 'idle'), // idle, loading, done
  sections: types.array(sectionModel),
  extensions: types.array(extensionModel)
}).actions(self => {
  return {
    assign(obj) {
      Object.assign(self, obj);
    }
  };
}).views(self => {
  return {
    getExtensionById(id) {
      return resolveIdentifier(extensionModel, self, id);
    },
    hasSectionExtId(id) {
      return self.sections.some(section => section.hasId(id));
    },
    excludeSectionIds(ids) {
      return ids.filter(id => !self.hasSectionExtId(id));
    },
    afterCreate() {
      self.assign({state: 'loading'});
      return Promise.all([
        promisifyApi('chrome.storage.sync.get')({list: []}).then(storage => {
          self.assign({
            sections: storage.list
          });
        }),
        promisifyApi('chrome.management.getAll')(result => {
          self.assign({
            extensions: result
          });
        })
      ]).catch(err => {
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
    const sections = this.props.store.sections.map(section => {
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
    const isCustom = this.props.isCustom;
    const section = this.props.section;
    const extensions = section.getExtensions().map(extension => {
      return <Extension key={extension.id} extension={extension}/>
    });

    const actions = [];
    if (isCustom) {
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
          <input typeof="checkbox" checked={section.isChecked} onChange={section.handleToggle}/>
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
          <span title={extension.name}/>
        </div>
        <div className="cell action">{actions}</div>
      </div>
    );
  }
}

export default ReactDOM.render(<Popup store={storeModel.create()}/>, document.getElementById('root'));