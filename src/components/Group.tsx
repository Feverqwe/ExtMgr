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
import type ExtensionStore from '../stores/ExtensionStore';
import useStoreVersion from '../stores/useStoreVersion';

interface GroupStoreLike {
  id: string;
  name: string;
  computed?: string;
  isLoading: boolean;
  isChecked: boolean;
  extensions: readonly ExtensionStore[];
  subscribe(listener: () => void): () => void;
  getVersion(): number;
  setEnabled(enabled: boolean): Promise<void>;
  setName(name: string): void;
  save(): Promise<void> | void;
}

interface GroupProps {
  groupStore: GroupStoreLike;
}

const Group = ({groupStore}: GroupProps) => {
  useStoreVersion(groupStore);
  const {isOver, setNodeRef} = useDroppable({
    id: `drop:group:${groupStore.id}`,
    data: {kind: 'group', groupId: groupStore.id},
  });
  const [editing, setEditing] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const handleEdit = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setEditing(true);
  };

  const handleSave = (event: SyntheticEvent) => {
    event.preventDefault();
    const name = form.current?.elements.namedItem('name') as HTMLInputElement | null;

    if (name) {
      groupStore.setName(name.value);
      groupStore.save();
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
      groupStore.setEnabled(!groupStore.isChecked);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    groupStore.setEnabled(!groupStore.isChecked);
  };

  const extensions = groupStore.extensions.map((extension) => (
    <Extension key={extension.id} extensionStore={extension} groupId={groupStore.id} />
  ));

  if (!extensions.length) {
    return null;
  }

  const headerClassNames = ['item group'];
  if (groupStore.isLoading) {
    headerClassNames.push('loading');
  }
  if (isOver) {
    headerClassNames.push('drop-target');
  }

  let name: ReactNode;
  if (editing) {
    headerClassNames.push('edit');
    name = (
      <form ref={form} onSubmit={handleSave}>
        <input name="name" defaultValue={groupStore.name} type="text" />
      </form>
    );
  } else {
    name = <span>{groupStore.name}</span>;
  }

  const actions: ReactNode[] = [];
  if (!groupStore.computed) {
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
        id={groupStore.id}
        className={headerClassNames.join(' ')}
        onClick={handleToggle}
      >
        <div className="field switch">
          <input type="checkbox" checked={groupStore.isChecked} onChange={handleChange} />
        </div>
        <div className="field name">{name}</div>
        <div className="field action">{actions}</div>
      </div>
      <SortableContext
        items={groupStore.extensions.map(({id}) => id)}
        strategy={verticalListSortingStrategy}
      >
        {extensions}
      </SortableContext>
    </>
  );
};

export default Group;
