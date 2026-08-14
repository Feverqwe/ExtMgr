import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type React from 'react';
import {usePopup} from '../context/PopupContext';
import emptyIcon from '../assets/img/empty.svg';

interface ExtensionProps {
  extensionId: string;
  groupId: string;
}

const Extension = ({extensionId, groupId}: ExtensionProps) => {
  const {
    extensions,
    launchExtension,
    openExtensionOptions,
    setExtensionEnabled,
    uninstallExtension,
  } = usePopup();
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: extensionId,
    data: {kind: 'extension', groupId},
  });
  const extension = extensions.get(extensionId);

  if (!extension) return null;

  const handleToggle = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.target;

    if (
      target === event.currentTarget ||
      (target instanceof Element &&
        (target.matches('.name span') || target.matches('.name') || target.matches('.switch')))
    ) {
      setExtensionEnabled(extension.id, !extension.enabled);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setExtensionEnabled(extension.id, !extension.enabled);
  };

  const handleLaunch = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    launchExtension(extension.id);
  };

  const handleOptions = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    openExtensionOptions(extension.id);
  };

  const handleUninstall = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    uninstallExtension(extension.id);
  };

  const classNames = ['item extension'];
  if (extension.isLoading) classNames.push('loading');
  if (isDragging) classNames.push('dragging');

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const actions: React.ReactNode[] = [];
  if (extension.enabled) {
    if (extension.launchType) {
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
    if (extension.optionsUrl) {
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

  const enabledTitle = extension.enabled
    ? chrome.i18n.getMessage('disable')
    : chrome.i18n.getMessage('enable');

  return (
    <div
      ref={setNodeRef}
      id={extension.id}
      className={classNames.join(' ')}
      style={style}
      onClick={handleToggle}
      title={extension.descriptionTitle}
    >
      <div className="field switch">
        <input
          type="checkbox"
          title={enabledTitle}
          checked={extension.enabled}
          disabled={!extension.mayDisable}
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
        <img src={extension.icon19 || emptyIcon} alt="" />
      </div>
      <div className="field name">
        <span>{extension.name}</span>
      </div>
      <div className="field action">{actions}</div>
    </div>
  );
};

export default Extension;
