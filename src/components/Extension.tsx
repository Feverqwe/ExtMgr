import {observer} from 'mobx-react';
import React from 'react';
import type {ExtensionStoreInstance} from '../stores/ExtensionStore';
import emptyIcon from '../assets/img/empty.svg';

interface ExtensionProps {
  extensionStore: ExtensionStoreInstance;
}

class Extension extends React.PureComponent<ExtensionProps> {
  get extensionStore() {
    return this.props.extensionStore;
  }

  handleToggle = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.target;

    if (
      target === event.currentTarget ||
      (target instanceof Element &&
        (target.matches('.name span') || target.matches('.name') || target.matches('.switch')))
    ) {
      this.extensionStore.setEnabled(!this.extensionStore.enabled);
    }
  };

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    this.extensionStore.setEnabled(!this.extensionStore.enabled);
  };

  handleLaunch = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.extensionStore.launch();
  };

  handleOptions = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.extensionStore.openOptions();
  };

  handleUninstall = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.extensionStore.uninstall();
  };

  render() {
    const {extensionStore} = this;
    const classNames = ['item extension'];

    if (extensionStore.isLoading) {
      classNames.push('loading');
    }

    const actions: React.ReactNode[] = [];
    if (extensionStore.enabled) {
      if (extensionStore.launchType) {
        actions.push(
          <a
            key="launch"
            title={chrome.i18n.getMessage('launch')}
            href="#launch"
            className="btn launch"
            onClick={this.handleLaunch}
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
            onClick={this.handleOptions}
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
        onClick={this.handleUninstall}
      />,
    );

    const enabledTitle = extensionStore.enabled
      ? chrome.i18n.getMessage('disable')
      : chrome.i18n.getMessage('enable');

    return (
      <div
        id={extensionStore.id}
        className={classNames.join(' ')}
        onClick={this.handleToggle}
        title={extensionStore.descriptionTitle}
      >
        <div className="field switch">
          <input
            type="checkbox"
            title={enabledTitle}
            checked={extensionStore.enabled}
            disabled={!extensionStore.mayDisable}
            onChange={this.handleChange}
          />
        </div>
        <div className="field icon" title={chrome.i18n.getMessage('move')}>
          <img src={extensionStore.icon19 || emptyIcon} alt="" />
        </div>
        <div className="field name">
          <span>{extensionStore.name}</span>
        </div>
        <div className="field action">{actions}</div>
      </div>
    );
  }
}

export default observer(Extension);
