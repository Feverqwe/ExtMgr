import {useDroppable} from '@dnd-kit/core';
import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import Extension from './Extension';
import {usePopup} from '../context/PopupContext';

interface GroupProps {
  groupId: string;
}

const Group = ({groupId}: GroupProps) => {
  const {groups, renameGroup, saveGroups, setGroupEnabled} = usePopup();
  const group = groups.find(({id}) => id === groupId);
  const {isOver, setNodeRef} = useDroppable({
    id: `drop:group:${groupId}`,
    data: {kind: 'group', groupId},
  });
  const [editing, setEditing] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  if (!group) return null;

  const handleEdit = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setEditing(true);
  };

  const handleSave = (event: SyntheticEvent) => {
    event.preventDefault();
    const name = form.current?.elements.namedItem('name') as HTMLInputElement | null;

    if (name) {
      renameGroup(group.id, name.value);
      saveGroups();
    }
    setEditing(false);
  };

  const handleToggle = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.target;

    if (
      target === event.currentTarget ||
      (target instanceof Element &&
        (target.matches('.name span') || target.matches('.name') || target.matches('.switch')))
    ) {
      setGroupEnabled(group.id, !group.isChecked);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setGroupEnabled(group.id, !group.isChecked);
  };

  const extensions = group.extensionIds.map((extensionId) => (
    <Extension key={extensionId} extensionId={extensionId} groupId={group.id} />
  ));

  if (!extensions.length) return null;

  const headerClassNames = ['item group'];
  if (group.isLoading) headerClassNames.push('loading');
  if (isOver) headerClassNames.push('drop-target');

  let name: ReactNode;
  if (editing) {
    headerClassNames.push('edit');
    name = (
      <form ref={form} onSubmit={handleSave}>
        <input name="name" defaultValue={group.name} type="text" />
      </form>
    );
  } else {
    name = <span>{group.name}</span>;
  }

  const actions: ReactNode[] = [];
  if (!group.computed) {
    if (editing) {
      actions.push(
        <a
          key="save"
          title={chrome.i18n.getMessage('save')}
          href="#save"
          onClick={handleSave}
          className="btn save"
        />,
      );
    } else {
      actions.push(
        <a
          key="edit"
          title={chrome.i18n.getMessage('edit')}
          href="#edit"
          onClick={handleEdit}
          className="btn edit"
        />,
      );
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        id={group.id}
        className={headerClassNames.join(' ')}
        onClick={handleToggle}
      >
        <div className="field switch">
          <input type="checkbox" checked={group.isChecked} onChange={handleChange} />
        </div>
        <div className="field name">{name}</div>
        <div className="field action">{actions}</div>
      </div>
      <SortableContext items={group.extensionIds} strategy={verticalListSortingStrategy}>
        {extensions}
      </SortableContext>
    </>
  );
};

export default Group;
