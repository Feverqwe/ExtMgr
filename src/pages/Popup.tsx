import {inject, observer} from 'mobx-react';
import React from 'react';
import Sortable from 'sortablejs';
import Group from '../components/Group';
import type {ComputedGroupStoreInstance} from '../stores/ComputedGroupStore';
import type {GroupStoreInstance} from '../stores/GroupStore';
import type {RootStoreInstance} from '../stores/RootStore';

interface PopupProps {
  rootStore?: RootStoreInstance;
}

export class PopupView extends React.PureComponent<PopupProps> {
  sortable: Sortable | null = null;

  componentDidMount() {
    this.rootStore.init();
  }

  get rootStore() {
    if (!this.props.rootStore) {
      throw new Error('Popup requires RootStore from MobX Provider');
    }
    return this.props.rootStore;
  }

  getGroupFromNode(
    node: Element | null,
  ): GroupStoreInstance | ComputedGroupStoreInstance | undefined {
    let currentNode = node;
    while (currentNode && !currentNode.classList.contains('group')) {
      currentNode = currentNode.previousElementSibling;
    }
    return currentNode ? this.rootStore.getGroupById(currentNode.id) : undefined;
  }

  refGroups = (node: HTMLDivElement | null) => {
    if (!node) {
      if (this.sortable) {
        this.sortable.destroy();
        this.sortable = null;
      }
      return;
    }

    if (this.sortable) {
      return;
    }

    const {rootStore} = this;

    // Work around SortableJS treating checkboxes as native drag inputs.
    node.getElementsByTagName = ((getElementsByTagName) => {
      return ((tagName: string) => {
        const sortableTagName = tagName === 'input' ? 'null-input' : tagName;
        return getElementsByTagName.call(node, sortableTagName);
      }) as typeof node.getElementsByTagName;
    })(node.getElementsByTagName);

    let startGroup: GroupStoreInstance | ComputedGroupStoreInstance | undefined;

    this.sortable = new Sortable(node, {
      group: 'extensions',
      handle: '.icon',
      draggable: '.item',
      onStart: (event) => {
        startGroup = this.getGroupFromNode(event.item);
      },
      onEnd: (event) => {
        const itemNode = event.item;
        const toGroup = this.getGroupFromNode(itemNode);
        const fromGroup = startGroup;
        startGroup = undefined;

        let previousNode = itemNode.previousElementSibling;
        if (previousNode?.classList.contains('group')) {
          previousNode = null;
        }

        let nextNode = itemNode.nextElementSibling;
        if (nextNode?.classList.contains('group')) {
          nextNode = null;
        }

        const id = itemNode.id;
        const previousId = previousNode?.id ?? null;
        const nextId = nextNode?.id ?? null;

        fromGroup?.removeItem(id);

        if (toGroup) {
          toGroup.insertItem(id, previousId, nextId);
        } else {
          rootStore.createGroup({name: 'Group', ids: [id]});
        }

        fromGroup?.removeIfEmpty();
        rootStore.saveGroups();
      },
    });
  };

  render() {
    const groups = this.rootStore.groups.map((group) => (
      <Group key={group.id} groupStore={group} />
    ));
    const computedGroups = this.rootStore.computedGroups.map((group) => (
      <Group key={group.id} groupStore={group} />
    ));

    return (
      <div ref={this.refGroups} className="groups">
        {groups}
        {computedGroups}
      </div>
    );
  }
}

export default inject('rootStore')(observer(PopupView));
