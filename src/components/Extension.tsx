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

  const handleToggle = () => {
    setExtensionEnabled(extension.id, !extension.enabled);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExtensionEnabled(extension.id, event.target.checked);
  };

  const handleLaunch = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    launchExtension(extension.id);
  };

  const handleOptions = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    openExtensionOptions(extension.id);
  };

  const handleUninstall = (event: React.MouseEvent<HTMLButtonElement>) => {
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
        <button
          type="button"
          key="launch"
          title={chrome.i18n.getMessage('launch')}
          aria-label={`${chrome.i18n.getMessage('launch')}: ${extension.name}`}
          className="btn launch"
          onClick={handleLaunch}
        />,
      );
    }
    if (extension.optionsUrl) {
      actions.push(
        <button
          type="button"
          key="options"
          title={chrome.i18n.getMessage('options')}
          aria-label={`${chrome.i18n.getMessage('options')}: ${extension.name}`}
          className="btn options"
          onClick={handleOptions}
        />,
      );
    }
  }
  actions.push(
    <button
      type="button"
      key="uninstall"
      title={chrome.i18n.getMessage('uninstall')}
      aria-label={`${chrome.i18n.getMessage('uninstall')}: ${extension.name}`}
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
      aria-busy={extension.isLoading}
    >
      <div className="field switch">
        <input
          type="checkbox"
          title={enabledTitle}
          aria-label={`${extension.name}: ${enabledTitle}`}
          checked={extension.enabled}
          disabled={!extension.mayDisable || extension.isLoading}
          onChange={handleChange}
        />
      </div>
      <div
        ref={setActivatorNodeRef}
        className="field icon drag-handle"
        title={chrome.i18n.getMessage('move')}
        {...attributes}
        {...listeners}
        aria-label={`${chrome.i18n.getMessage('move')}: ${extension.name}`}
      >
        <img src={extension.icon19 || emptyIcon} alt="" />
      </div>
      <div className="field name">
        <button
          type="button"
          className="name-button"
          title={extension.descriptionTitle}
          disabled={!extension.mayDisable || extension.isLoading}
          onClick={handleToggle}
        >
          {extension.name}
        </button>
      </div>
      <div className="field action">{actions}</div>
    </div>
  );
};

export default Extension;
