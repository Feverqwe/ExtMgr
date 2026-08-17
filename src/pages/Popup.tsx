import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
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
import {useState, type ReactNode} from 'react';
import Group from '../components/Group';
import {usePopup, type ExtensionView} from '../context/PopupContext';
import emptyIcon from '../assets/img/empty.svg';

const NEW_GROUP_DROP_ID = 'drop:new-group';

const collisionDetection: CollisionDetection = (args) => {
  const droppableContainers = args.droppableContainers.filter(({id}) => id !== args.active.id);
  const collisionArgs = {...args, droppableContainers};
  const byKind = (collisions: ReturnType<typeof pointerWithin>, kind: string) =>
    collisions.filter(
      ({id}) =>
        droppableContainers.find((container) => container.id === id)?.data.current?.kind === kind,
    );

  const pointerCollisions = pointerWithin(collisionArgs);
  const newGroupCollisions = byKind(pointerCollisions, 'new-group');
  if (newGroupCollisions.length) return newGroupCollisions;

  const extensionCollisions = byKind(pointerCollisions, 'extension');
  if (extensionCollisions.length) return extensionCollisions;

  const groupCollisions = byKind(pointerCollisions, 'group');
  if (groupCollisions.length) {
    const groupId = droppableContainers.find(({id}) => id === groupCollisions[0].id)?.data.current
      ?.groupId;
    const groupExtensions = droppableContainers.filter(
      (container) =>
        container.data.current?.kind === 'extension' && container.data.current.groupId === groupId,
    );
    const nearestExtension = closestCenter({
      ...collisionArgs,
      droppableContainers: groupExtensions,
    });
    if (nearestExtension.length) return nearestExtension;
    return groupCollisions;
  }

  return rectIntersection(collisionArgs);
};

const GroupsDropzone = ({isDragging}: {isDragging: boolean}) => {
  const {groups} = usePopup();
  const {isOver, setNodeRef} = useDroppable({
    id: NEW_GROUP_DROP_ID,
    data: {kind: 'new-group'},
    disabled: !isDragging,
  });

  return (
    <div className="groups">
      <div
        ref={setNodeRef}
        className={`new-group-drop${isDragging ? ' visible' : ''}${isOver ? ' active' : ''}`}
        aria-hidden={!isDragging}
      >
        {chrome.i18n.getMessage('newGroup')}
      </div>
      {groups.map((group) => (
        <Group key={group.id} groupId={group.id} />
      ))}
    </div>
  );
};

const DragPreview = ({extension}: {extension: ExtensionView}) => (
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

export const PopupView = () => {
  const {extensions, groups, moveExtension, status} = usePopup();
  const [activeExtensionId, setActiveExtensionId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 4}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
  );
  const activeExtension = activeExtensionId ? extensions.get(activeExtensionId) : undefined;

  const handleDragStart = ({active}: DragStartEvent) => {
    const id = String(active.id);
    setActiveExtensionId(extensions.has(id) ? id : null);
  };

  const handleDragEnd = ({active, over}: DragEndEvent) => {
    setActiveExtensionId(null);
    if (!over || active.id === over.id) return;

    const extensionId = String(active.id);
    const fromGroupId = active.data.current?.groupId;
    if (typeof fromGroupId !== 'string') return;

    const fromGroup = groups.find(({id}) => id === fromGroupId);
    if (!fromGroup) return;

    if (over.id === NEW_GROUP_DROP_ID) {
      moveExtension({extensionId, fromGroupId, createNewGroup: true});
      return;
    }

    const toGroupId = over.data.current?.groupId;
    if (typeof toGroupId !== 'string') return;

    const toGroup = groups.find(({id}) => id === toGroupId);
    if (!toGroup) return;

    const overExtensionId = over.data.current?.kind === 'extension' ? String(over.id) : undefined;
    const fromIndex = fromGroup.extensionIds.indexOf(extensionId);
    const overIndex = overExtensionId ? toGroup.extensionIds.indexOf(overExtensionId) : -1;
    const insertAfter = fromGroup.id === toGroup.id && fromIndex !== -1 && fromIndex < overIndex;

    moveExtension({
      extensionId,
      fromGroupId,
      toGroupId,
      overExtensionId,
      insertAfter,
    });
  };

  let content: ReactNode;
  if (status === 'pending' || status === 'idle') {
    content = (
      <div className="popup-state loading-state" aria-live="polite">
        <span className="state-spinner" aria-hidden="true" />
        <span>{chrome.i18n.getMessage('loading')}</span>
      </div>
    );
  } else if (status === 'error') {
    content = (
      <div className="popup-state error-state" role="alert">
        {chrome.i18n.getMessage('loadError')}
      </div>
    );
  } else if (extensions.size === 0) {
    content = <div className="popup-state empty-state">{chrome.i18n.getMessage('emptyTitle')}</div>;
  } else {
    content = <GroupsDropzone isDragging={activeExtensionId !== null} />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveExtensionId(null)}
      onDragEnd={handleDragEnd}
    >
      <main className="popup-shell">{content}</main>
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

export default PopupView;
