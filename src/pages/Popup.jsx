import {inject, observer} from 'mobx-react';
import React from 'react';
import PropTypes from 'prop-types';
import Group from "../components/Group";

const Sortable = require('sortablejs');

@inject('rootStore')
@observer
class Popup extends React.PureComponent {
  static propTypes = {
    rootStore: PropTypes.object,
  };

  componentDidMount() {
    this.rootStore.init();
  }

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  getGroupFromNode(node) {
    while (node && !node.classList.contains('group')) {
      node = node.previousElementSibling;
    }
    let groupStore = null;
    if (node) {
      groupStore = this.rootStore.getGroupById(node.id);
    }
    return groupStore;
  }

  sortable = null;
  refGroups = (node) => {
    if (!node) {
      if (this.sortable) {
        this.sortable.destroy();
        this.sortable = null;
      }
    } else if (this.sortable) {
      // pass
    } else {
      const rootStore = this.rootStore;

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
        onStart: (e) => {
          const itemNode = e.item;
          startGroup = this.getGroupFromNode(itemNode);
        },
        onEnd: (e) => {
          const itemNode = e.item;
          const toGroup = this.getGroupFromNode(itemNode);
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
            rootStore.createGroup({
              name: 'Group',
              ids: [id]
            });
          } else {
            toGroup.insertItem(id, prevId, nextId);
          }

          if (fromGroup) {
            fromGroup.removeIfEmpty();
          }

          rootStore.saveGroups();
        },
      });
    }
  };

  render() {
    const groups = this.rootStore.groups.map(group => (
      <Group key={group.id} groupStore={group}/>
    ));

    const computedGroups = this.rootStore.computedGroups.map(group => (
      <Group key={group.id} groupStore={group}/>
    ));

    return (
      <div ref={this.refGroups} className="groups">
        {groups}
        {computedGroups}
      </div>
    );
  }
}

export default Popup;