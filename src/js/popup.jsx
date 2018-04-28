import '../css/popup.less';
import {observer} from 'mobx-react';
import ReactDOM from 'react-dom';
import React from 'react';
import storeModel from "./model/store";

const debug = require('debug')('popup');
const emptyIcon = require('../img/empty.svg');
const Sortable = require('sortablejs');

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

          if (fromGroup) {
            fromGroup.removeItem(id);
          }

          if (!toGroup) {
            store.unshiftGroup({
              name: 'Group',
              ids: [id]
            });
          } else {
            toGroup.insertItem(id, prevId, nextId);
          }

          if (fromGroup) {
            fromGroup.removeIfEmpty();
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
    group.setName(this.refs.name.value);
    this.setState({
      editing: false
    });
    group.save();
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
    const extensions = group.getExtensions().map(extension => {
      return <Extension key={extension.id} extension={extension}/>
    });

    if (!extensions.length) {
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