import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type React from 'react';
import type ExtensionStore from '../stores/ExtensionStore';
import useStoreVersion from '../stores/useStoreVersion';
import emptyIcon from '../assets/img/empty.svg';

interface ExtensionProps {
  extensionStore: ExtensionStore;
  groupId: string;
}

const Extension = ({extensionStore, groupId}: ExtensionProps) => {
  useStoreVersion(extensionStore);
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: extensionStore.id,
    data: {kind: 'extension', groupId},
  });

  const handleToggle = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.target;

    if (
      target === event.currentTarget ||
      (target instanceof Element &&
        (target.matches('.name span') || target.matches('.name') || target.matches('.switch')))
    ) {
      extensionStore.setEnabled(!extensionStore.enabled);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    extensionStore.setEnabled(!extensionStore.enabled);
  };

  const handleLaunch = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    extensionStore.launch();
  };

  const handleOptions = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    extensionStore.openOptions();
  };

  const handleUninstall = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    extensionStore.uninstall();
  };

  const classNames = ['item extension'];
  if (extensionStore.isLoading) {
    classNames.push('loading');
  }
  if (isDragging) {
    classNames.push('dragging');
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const actions: React.ReactNode[] = [];
  if (extensionStore.enabled) {
    if (extensionStore.launchType) {
      actions.push(
        <a
          key="launch"
          title={chrome.i18n.getMessage('launch')}
          href="#launch"
          className="btn launch"
          onClick={handleLaunch}
        />,
      );
    }
    if (extensionStore.optionsUrl) {
      actions.push(
        <a
          key="options"
          title={chrome.i18n.getMessage('options')}
          href="#options"
          className="btn options"
          onClick={handleOptions}
        />,
      );
    }
  }
  actions.push(
    <a
      key="uninstall"
      title={chrome.i18n.getMessage('uninstall')}
      href="#uninstall"
      className="btn remove"
      onClick={handleUninstall}
    />,
  );

  const enabledTitle = extensionStore.enabled
    ? chrome.i18n.getMessage('disable')
    : chrome.i18n.getMessage('enable');

  return (
    <div
      ref={setNodeRef}
      id={extensionStore.id}
      className={classNames.join(' ')}
      style={style}
      onClick={handleToggle}
      title={extensionStore.descriptionTitle}
    >
      <div className="field switch">
        <input
          type="checkbox"
          title={enabledTitle}
          checked={extensionStore.enabled}
          disabled={!extensionStore.mayDisable}
          onChange={handleChange}
        />
      </div>
      <div
        ref={setActivatorNodeRef}
        className="field icon"
        title={chrome.i18n.getMessage('move')}
        {...attributes}
        {...listeners}
      >
        <img src={extensionStore.icon19 || emptyIcon} alt="" />
      </div>
      <div className="field name">
        <span>{extensionStore.name}</span>
      </div>
      <div className="field action">{actions}</div>
    </div>
  );
};

export default Extension;
