import {useDroppable} from '@dnd-kit/core';
import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
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
  const input = useRef<HTMLInputElement>(null);
  const checkbox = useRef<HTMLInputElement>(null);
  const actionButton = useRef<HTMLButtonElement>(null);
  const restoreActionFocus = useRef(false);

  useEffect(() => {
    if (checkbox.current) checkbox.current.indeterminate = group?.isIndeterminate ?? false;
  }, [group?.isIndeterminate]);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!editing && restoreActionFocus.current) {
      restoreActionFocus.current = false;
      actionButton.current?.focus();
    }
  }, [editing]);

  if (!group) return null;

  const handleEdit = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setEditing(true);
  };

  const handleSave = (event: SyntheticEvent) => {
    event.preventDefault();
    const name = form.current?.elements.namedItem('name') as HTMLInputElement | null;

    const nextName = name?.value.trim();

    if (nextName && nextName !== group.name) {
      renameGroup(group.id, nextName);
      saveGroups().catch((error: unknown) => console.error('[Group] save error', error));
    }
    restoreActionFocus.current = true;
    setEditing(false);
  };

  const handleToggle = () => {
    setGroupEnabled(group.id, !group.isChecked);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setGroupEnabled(group.id, event.target.checked);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      restoreActionFocus.current = true;
      setEditing(false);
    }
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
        <input
          ref={input}
          name="name"
          defaultValue={group.name}
          aria-label={chrome.i18n.getMessage('groupName')}
          maxLength={60}
          type="text"
          onKeyDown={handleInputKeyDown}
        />
      </form>
    );
  } else {
    name = (
      <button
        type="button"
        className="name-button"
        disabled={group.isLoading}
        onClick={handleToggle}
      >
        <span>{group.name}</span>
      </button>
    );
  }

  const actions: ReactNode[] = [];
  if (!group.computed) {
    if (editing) {
      actions.push(
        <button
          ref={actionButton}
          type="button"
          key="save"
          title={chrome.i18n.getMessage('save')}
          aria-label={`${chrome.i18n.getMessage('save')}: ${group.name}`}
          onClick={handleSave}
          className="btn save"
        />,
      );
    } else {
      actions.push(
        <button
          ref={actionButton}
          type="button"
          key="edit"
          title={chrome.i18n.getMessage('edit')}
          aria-label={`${chrome.i18n.getMessage('edit')}: ${group.name}`}
          onClick={handleEdit}
          className="btn edit"
        />,
      );
    }
  }

  return (
    <section className="group-block" aria-label={group.name}>
      <div
        ref={setNodeRef}
        id={group.id}
        className={headerClassNames.join(' ')}
        aria-busy={group.isLoading}
      >
        <label className="field switch">
          <input
            ref={checkbox}
            type="checkbox"
            aria-label={`${group.name}: ${chrome.i18n.getMessage(group.isChecked ? 'disable' : 'enable')}`}
            checked={group.isChecked}
            disabled={group.isLoading}
            onChange={handleChange}
          />
        </label>
        <div className="field name">{name}</div>
        <div className="field action">{actions}</div>
      </div>
      <SortableContext items={group.extensionIds} strategy={verticalListSortingStrategy}>
        {extensions}
      </SortableContext>
    </section>
  );
};

export default Group;
