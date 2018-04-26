import '../css/popup.less';
import {types} from 'mobx-state-tree';
import {observer} from 'mobx-react';
import ReactDOM from 'react-dom';
import React from 'react';
import groupModel from "./model/group";
import promisifyApi from "../tools/promisifyApi";
import extensionModel from "./model/extension";
import toCameCase from "../tools/toCameCase";

const debug = require('debug')('popup');
const emptyIcon = require('../img/empty.svg');

const storeModel = types.model('storeModel', {
  state: types.optional(types.string, 'idle'), // idle, loading, done
  groups: types.optional(types.array(groupModel), []),
  extensions: types.optional(types.array(extensionModel), [])
}).actions(self => {
  return {
    addSection(group) {
      self.groups.push(group);
    },
    assign(obj) {
      Object.assign(self, obj);
    }
  };
}).views(self => {
  return {
    getExtensionIds() {
      return self.extensions.map(extension => extension.id);
    },
    getExtensionsWithoutSection() {
      const groupExtensionIds = [];
      self.groups.forEach(group => {
        if (!group.computed) {
          groupExtensionIds.push(...group.getIds());
        }
      });
      return self.extensions.filter(extensoin => groupExtensionIds.indexOf(extensoin.id) === -1);
    },
    getExtensionsByType(type) {
      return self.getExtensionsWithoutSection().filter(extension => extension.type === type);
    },
    afterCreate() {
      self.assign({state: 'loading'});
      return Promise.all([
        promisifyApi('chrome.storage.sync.get')({list: []}).then(storage => {
          self.assign({
            groups: storage.list
          });
        }),
        promisifyApi('chrome.management.getAll')().then(result => {
          result.sort(function (a, b) {
            return a.name > b.name ? 1 : -1;
          });
          const extensions = result.filter(extension => {
            return extension.id !== chrome.runtime.id;
          });
          self.assign({
            extensions: extensions
          });
        })
      ]).then(() => {
        ['extension', 'hosted_app', 'packaged_app', 'legacy_packaged_app', 'theme'].forEach(type => {
          self.addSection(groupModel.create({
            computed: type,
            name: chrome.i18n.getMessage(toCameCase(type) + 'Type')
          }));
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
    const groups = store.groups.map(group => {
      return (
        <Group key={group.name} group={group}/>
      );
    });

    return (
      <div className="list">{groups}</div>
    );
  }
}

@observer class Group extends React.Component {
  constructor() {
    super();

    this.state = {
      editing: false
    };

    this.handleEdit = this.handleEdit.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }
  handleEdit(e) {
    e.preventDefault();
    this.setState({
      editing: true
    });
  }
  handleSave(e) {
    e.preventDefault();
    const group = this.props.group;
    group.setName({
      name: this.refs.name.value
    });
    this.setState({
      editing: false
    });
  }
  getActions() {
    const group = this.props.group;
    const computed = !!group.computed;

    const actions = [];
    if (!computed) {
      if (this.state.editing) {
        actions.push(
          <a key={'save'}
             title={chrome.i18n.getMessage('save')}
             href={'#save'}
             onClick={this.handleSave}
             className="btn save"/>
        );
      } else {
        actions.push(
          <a key={'edit'}
             title={chrome.i18n.getMessage('edit')}
             href={'#edit'}
             onClick={this.handleEdit}
             className="btn edit"/>
        );
      }
    }
    return actions;
  }
  render() {
    const group = this.props.group;
    const computed = !!group.computed;
    const extensions = group.getExtensions().map(extension => {
      return <Extension key={extension.id} extension={extension}/>
    });

    if (computed && !extensions.length) {
      return null;
    }

    const headerClassList = ['row', 'header'];
    if (group.isLoading) {
      headerClassList.push('loading');
    }
    let name = null;
    if (this.state.editing) {
      headerClassList.push('edit');
      name = (
        <form onSubmit={this.handleSave}>
          <input ref={'name'} defaultValue={group.name} type={'text'}/>
        </form>
      );
    } else {
      name = (
        <span>{group.name}</span>
      );
    }

    return (
      <div key={group.name} className="group" onClick={group.handleToggle}>
        <div className={headerClassList.join(' ')}>
          <div className="cell switch">
            <input type="checkbox" checked={group.isChecked} onChange={group.handleToggle}/>
          </div>
          <div className="cell name">{name}</div>
          <div className="cell action">{this.getActions()}</div>
        </div>
        <div className="extension">
          {extensions}
        </div>
      </div>
    );
  }
}

@observer class Extension extends React.Component {
  constructor() {
    super();
  }
  getActions() {
    /**@type Extension*/
    const extension = this.props.extension;

    const actions = [];
    if (extension.enabled) {
      if (extension.launchType) {
        actions.push(
          <a key={'launch'}
             title={chrome.i18n.getMessage('launch')}
             href={'#launch'}
             className="btn launch"
             onClick={extension.handleLaunch}/>
        );
      }
      if (extension.optionsUrl) {
        actions.push(
          <a key={'options'}
             title={chrome.i18n.getMessage('options')}
             href={'#options'}
             className="btn options"
             onClick={extension.handleOptions}/>
        );
      }
    }
    actions.push(
      <a key={'uninstall'}
         title={chrome.i18n.getMessage('uninstall')}
         href={'#uninstall'}
         className="btn remove"
         onClick={extension.handleUninstall}/>
    );
    return actions;
  }
  render() {
    /**@type Extension*/
    const extension = this.props.extension;

    const classList = ['row'];
    if (extension.isLoading) {
      classList.push('loading');
    }

    return (
      <div id={extension.id} className={classList.join(' ')} onClick={extension.handleToggle} title={extension.getDescription()}>
        <div className="cell switch">
          <input type="checkbox"
                 title={extension.enabled ? chrome.i18n.getMessage('disable') : chrome.i18n.getMessage('enable')}
                 checked={extension.enabled} disabled={!extension.mayDisable} onChange={extension.handleToggle}/>
        </div>
        <div className="cell icon" title={chrome.i18n.getMessage('move')}>
          <img src={extension.getIcon(19) || emptyIcon}/>
        </div>
        <div className="cell name">
          <span>{extension.name}</span>
        </div>
        <div className="cell action">{this.getActions()}</div>
      </div>
    );
  }
}

export default ReactDOM.render(<Popup store={storeModel.create()}/>, document.getElementById('root'));