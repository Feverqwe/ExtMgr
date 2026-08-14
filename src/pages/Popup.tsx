import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {sortableKeyboardCoordinates} from '@dnd-kit/sortable';
import {useEffect, useState} from 'react';
import Group from '../components/Group';
import type ExtensionStore from '../stores/ExtensionStore';
import type RootStore from '../stores/RootStore';
import useStoreVersion from '../stores/useStoreVersion';
import emptyIcon from '../assets/img/empty.svg';

interface PopupProps {
  rootStore: RootStore;
}

const NEW_GROUP_DROP_ID = 'drop:new-group';

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const specificCollisions = pointerCollisions.filter(({id}) => id !== NEW_GROUP_DROP_ID);

  if (specificCollisions.length) {
    return specificCollisions;
  }
  return pointerCollisions.length ? pointerCollisions : rectIntersection(args);
};

const GroupsDropzone = ({rootStore}: PopupProps) => {
  const {setNodeRef} = useDroppable({
    id: NEW_GROUP_DROP_ID,
    data: {kind: 'new-group'},
  });

  return (
    <div ref={setNodeRef} className="groups">
      {rootStore.groups.map((group) => (
        <Group key={group.id} groupStore={group} />
      ))}
      {rootStore.computedGroups.map((group) => (
        <Group key={group.id} groupStore={group} />
      ))}
    </div>
  );
};

const DragPreview = ({extension}: {extension: ExtensionStore}) => (
  <div className="item extension drag-overlay">
    <div className="field switch" />
    <div className="field icon">
      <img src={extension.icon19 || emptyIcon} alt="" />
    </div>
    <div className="field name">
      <span>{extension.name}</span>
    </div>
  </div>
);

export const PopupView = ({rootStore}: PopupProps) => {
  useStoreVersion(rootStore);
  const [activeExtension, setActiveExtension] = useState<ExtensionStore | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 4}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
  );

  const handleDragStart = ({active}: DragStartEvent) => {
    setActiveExtension(rootStore.extensions.get(String(active.id)) ?? null);
  };

  const handleDragEnd = ({active, over}: DragEndEvent) => {
    setActiveExtension(null);

    if (!over || active.id === over.id) {
      return;
    }

    const extensionId = String(active.id);
    const fromGroupId = active.data.current?.groupId;
    if (typeof fromGroupId !== 'string') {
      return;
    }

    const fromGroup = rootStore.getGroupById(fromGroupId);
    if (!fromGroup) {
      return;
    }

    if (over.id === NEW_GROUP_DROP_ID) {
      fromGroup.removeItem(extensionId);
      rootStore.createGroup({name: 'Group', ids: [extensionId]});
    } else {
      const toGroupId = over.data.current?.groupId;
      if (typeof toGroupId !== 'string') {
        return;
      }

      const toGroup = rootStore.getGroupById(toGroupId);
      if (!toGroup) {
        return;
      }

      const overExtensionId = over.data.current?.kind === 'extension' ? String(over.id) : null;
      const fromIndex = fromGroup.extensions.findIndex(({id}) => id === extensionId);
      const overIndex = overExtensionId
        ? toGroup.extensions.findIndex(({id}) => id === overExtensionId)
        : -1;
      const insertAfter = fromGroup === toGroup && fromIndex !== -1 && fromIndex < overIndex;

      fromGroup.removeItem(extensionId);
      toGroup.insertItem(
        extensionId,
        insertAfter ? overExtensionId : null,
        insertAfter ? null : overExtensionId,
      );
    }

    fromGroup.removeIfEmpty();
    rootStore.saveGroups();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveExtension(null)}
      onDragEnd={handleDragEnd}
    >
      <GroupsDropzone rootStore={rootStore} />
      <DragOverlay>
        {activeExtension ? (
          <div className="groups drag-overlay-groups">
            <DragPreview extension={activeExtension} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

const Popup = ({rootStore}: PopupProps) => {
  useEffect(() => {
    rootStore.init();
    return () => rootStore.destroy();
  }, [rootStore]);

  return <PopupView rootStore={rootStore} />;
};

export default Popup;
