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
import {useState} from 'react';
import Group from '../components/Group';
import {usePopup, type ExtensionView} from '../context/PopupContext';
import emptyIcon from '../assets/img/empty.svg';

const NEW_GROUP_DROP_ID = 'drop:new-group';

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const specificCollisions = pointerCollisions.filter(({id}) => id !== NEW_GROUP_DROP_ID);

  if (specificCollisions.length) return specificCollisions;
  return pointerCollisions.length ? pointerCollisions : rectIntersection(args);
};

const GroupsDropzone = () => {
  const {groups} = usePopup();
  const {setNodeRef} = useDroppable({
    id: NEW_GROUP_DROP_ID,
    data: {kind: 'new-group'},
  });

  return (
    <div ref={setNodeRef} className="groups">
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
  const {extensions, groups, moveExtension} = usePopup();
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

    moveExtension({
      extensionId,
      fromGroupId,
      toGroupId,
      overExtensionId,
      insertAfter: fromGroup.id === toGroup.id && fromIndex !== -1 && fromIndex < overIndex,
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveExtensionId(null)}
      onDragEnd={handleDragEnd}
    >
      <GroupsDropzone />
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
