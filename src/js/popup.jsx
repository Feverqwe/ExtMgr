import 'bootstrap/dist/css/bootstrap.css'
import '../css/popup.less';
import {types, resolveIdentifier, destroy, getSnapshot} from 'mobx-state-tree';
import {observer} from 'mobx-react';
import ReactDOM from 'react-dom';
import React from 'react';
import groupModel from "./model/group";
import promisifyApi from "../tools/promisifyApi";
import extensionModel from "./model/extension";
import toCameCase from "../tools/toCameCase";

const debug = require('debug')('popup');
const emptyIcon = require('../img/empty.svg');
const Sortable = require('sortablejs');
const promiseLimit = require('promise-limit');
const oneLimit = promiseLimit(1);

const storeModel = types.model('storeModel', {
  state: types.optional(types.string, 'idle'), // idle, loading, done
  groups: types.optional(types.array(groupModel), []),
  extensions: types.optional(types.array(extensionModel), [])
}).actions(self => {
  return {
    addGroup(...group) {
      self.groups.push(...group);
    },
    unshiftGroup(...group) {
      self.groups.unshift(...group);
    },
    addExtension(extension) {
      self.extensions.push(extension);
    },
    removeExtension(id) {
      const extension = self.getExtensionById(id);
      if (extension) {
        destroy(extension);
      }
    },
    removeGroup(id) {
      const group = self.getGroupById(id);
      if (group) {
        destroy(group);
      }
    },
    assign(obj) {
      Object.assign(self, obj);
    }
  };
}).views(self => {
  const handleInstalledListener = extension => {
    const exists = !!self.getExtensionById(extension.id);
    if (!exists) {
      self.addExtension(extension);
    }
  };
  const handleUninstalledListener = id => {
    self.removeExtension(id);
  };

  return {
    getGroupById(id) {
      return resolveIdentifier(groupModel, self, id);
    },
    getExtensionById(id) {
      return resolveIdentifier(extensionModel, self, id);
    },
    getExtensionIds() {
      return self.extensions.map(extension => extension.id);
    },
    getExtensionsWithoutGroup() {
      const groupExtensionIds = [];
      self.groups.forEach(group => {
        if (!group.computed) {
          groupExtensionIds.push(...group.getIds());
        }
      });
      return self.extensions.filter(extensoin => groupExtensionIds.indexOf(extensoin.id) === -1);
    },
    getExtensionsByType(type) {
      return self.getExtensionsWithoutGroup().filter(extension => extension.type === type);
    },
    createGroup(group) {
      self.unshiftGroup(group);
    },
    saveGroups() {
      debug('save');
      return oneLimit(() => {
        const list = getSnapshot(self.groups).filter(group => {
          return !group.computed;
        });
        return promisifyApi('chrome.storage.sync.set')({list: list});
      });
    },
    afterCreate() {
      self.assign({state: 'loading'});

      ['extension', 'hosted_app', 'packaged_app', 'legacy_packaged_app', 'theme'].forEach(type => {
        self.addGroup(groupModel.create({
          computed: type,
          name: chrome.i18n.getMessage(toCameCase(type) + 'Type')
        }));
      });

      return Promise.all([
        promisifyApi('chrome.storage.sync.get')({list: []}).then(storage => {
          self.unshiftGroup(...storage.list);
        }),
        promisifyApi('chrome.management.getAll')().then(result => {
          chrome.management.onInstalled.addListener(handleInstalledListener);
          chrome.management.onUninstalled.addListener(handleUninstalledListener);

          result.sort(function (a, b) {
            return a.name > b.name ? 1 : -1;
          });
          result.forEach(extension => {
            if (extension.id !== chrome.runtime.id) {
              self.addExtension(extension);
            }
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

    this.refGroups = this.refGroups.bind(this);

    this.sortable = null;
  }
  getGroupFromNode(node) {
    while (node && !node.classList.contains('group')) {
      node = node.previousElementSibling;
    }
    let group = null;
    if (node) {
      group = this.props.store.getGroupById(node.id);
    }
    return group;
  }
  refGroups(node) {
    if (!node) {
      if (this.sortable) {
        this.sortable.destroy();
        this.sortable = null;
        // debug('destroy');
      }
    } else
    if (this.sortable) {
      // debug('update');
    } else {
      const self = this;
      const store = this.props.store;

      // fix sortable bug with checkbox
      node.getElementsByTagName = ((node, getElementsByTagName) => {
        return tagName => {
          if (tagName === 'input') {
            tagName = 'null-input';
          }
          return getElementsByTagName.call(node, tagName);
        }
      })(node, node.getElementsByTagName);

      let startGroup = null;

      this.sortable = new Sortable(node, {
        group: 'extensions',
        handle: '.icon',
        draggable: '.item',
        onStart(e) {
          const itemNode = e.item;
          startGroup = self.getGroupFromNode(itemNode);
        },
        onEnd(e) {
          const itemNode = e.item;
          const toGroup = self.getGroupFromNode(itemNode);
          const fromGroup = startGroup;
          startGroup = null;

          let prevNode = itemNode.previousElementSibling;
          if (prevNode && prevNode.classList.contains('group')) {
            prevNode = null;
          }

          let nextNode = itemNode.nextElementSibling;
          if (nextNode && nextNode.classList.contains('group')) {
            nextNode = null;
          }

          const id = itemNode.id;
          const prevId = prevNode && prevNode.id;
          const nextId = nextNode && nextNode.id;

          if (toGroup && fromGroup.id !== toGroup.id) {
            fromGroup.removeItem(id);
          }

          if (!toGroup) {
            store.createGroup({
              name: 'Group',
              ids: [id]
            });
          } else {
            toGroup.moveItem(id, prevId, nextId);
          }

          store.saveGroups();
        },
      });
    }
  }
  render() {
    const store = this.props.store;

    const groups = store.groups.map(group => (
      <Group key={group.id} group={group}/>
    ));

    return (
      <div ref={this.refGroups} className="groups">{groups}</div>
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
    this.handleToggle = this.handleToggle.bind(this);
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
  handleToggle(e) {
    const group = this.props.group;
    if (e.target === this.refs.header ||
      e.target.matches('.name span') ||
      e.target.matches('.name') ||
      e.target.matches('.switch')
    ) {
      group.handleToggle(e);
    }
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

    const headerClassList = ['item', 'group'];
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

    return [
      <div key={group.id} id={group.id} className={headerClassList.join(' ')} onClick={this.handleToggle}>
        <div className="field switch">
          <input type="checkbox" checked={group.isChecked} onChange={group.handleToggle}/>
        </div>
        <div className="field name">{name}</div>
        <div className="field action">{this.getActions()}</div>
      </div>,
      ...extensions
    ];
  }
}

@observer class Extension extends React.Component {
  constructor() {
    super();

    this.handleToggle = this.handleToggle.bind(this);
  }
  handleToggle(e) {
    const extension = this.props.extension;
    if (e.target === this.refs.extension ||
      e.target.matches('.name span') ||
      e.target.matches('.name') ||
      e.target.matches('.switch')
    ) {
      extension.handleToggle(e);
    }
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

    const classList = ['item', 'extension'];
    if (extension.isLoading) {
      classList.push('loading');
    }

    return (
      <div ref={'extension'}
           id={extension.id}
           className={classList.join(' ')}
           onClick={this.handleToggle}
           title={extension.getDescription()}>
        <div className="field switch">
          <input type="checkbox"
                 title={extension.enabled ? chrome.i18n.getMessage('disable') : chrome.i18n.getMessage('enable')}
                 checked={extension.enabled}
                 disabled={!extension.mayDisable}
                 onChange={extension.handleToggle}/>
        </div>
        <div className="field icon" title={chrome.i18n.getMessage('move')}>
          <img src={extension.getIcon(19) || emptyIcon}/>
        </div>
        <div className="field name">
          <span>{extension.name}</span>
        </div>
        <div className="field action">{this.getActions()}</div>
      </div>
    );
  }
}

export default window.popup = ReactDOM.render(<Popup store={storeModel.create()}/>, document.getElementById('root'));