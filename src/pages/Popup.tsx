import {useEffect, useRef} from 'react';
import Sortable from 'sortablejs';
import Group from '../components/Group';
import type ComputedGroupStore from '../stores/ComputedGroupStore';
import type GroupStore from '../stores/GroupStore';
import type RootStore from '../stores/RootStore';
import useStoreVersion from '../stores/useStoreVersion';

interface PopupProps {
  rootStore: RootStore;
}

type AnyGroupStore = GroupStore | ComputedGroupStore;

const getGroupFromNode = (
  rootStore: RootStore,
  node: Element | null,
): AnyGroupStore | undefined => {
  let currentNode = node;
  while (currentNode && !currentNode.classList.contains('group')) {
    currentNode = currentNode.previousElementSibling;
  }
  return currentNode ? rootStore.getGroupById(currentNode.id) : undefined;
};

const Popup = ({rootStore}: PopupProps) => {
  useStoreVersion(rootStore);
  const groupsNode = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootStore.init();
    return () => rootStore.destroy();
  }, [rootStore]);

  useEffect(() => {
    const node = groupsNode.current;
    if (!node) {
      return;
    }

    const originalGetElementsByTagName = node.getElementsByTagName;
    // Work around SortableJS treating checkboxes as native drag inputs.
    node.getElementsByTagName = ((tagName: string) => {
      const sortableTagName = tagName === 'input' ? 'null-input' : tagName;
      return originalGetElementsByTagName.call(node, sortableTagName);
    }) as typeof node.getElementsByTagName;

    let startGroup: AnyGroupStore | undefined;
    const sortable = new Sortable(node, {
      group: 'extensions',
      handle: '.icon',
      draggable: '.item',
      onStart: (event) => {
        startGroup = getGroupFromNode(rootStore, event.item);
      },
      onEnd: (event) => {
        const itemNode = event.item;
        const toGroup = getGroupFromNode(rootStore, itemNode);
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

    return () => {
      sortable.destroy();
      node.getElementsByTagName = originalGetElementsByTagName;
    };
  }, [rootStore]);

  return (
    <div ref={groupsNode} className="groups">
      {rootStore.groups.map((group) => (
        <Group key={group.id} groupStore={group} />
      ))}
      {rootStore.computedGroups.map((group) => (
        <Group key={group.id} groupStore={group} />
      ))}
    </div>
  );
};

export default Popup;
