import {observer} from "mobx-react";
import React from "react";
import PropTypes from 'prop-types';

const emptyIcon = require('../assets/img/empty.svg');

@observer
class Extension extends React.PureComponent {
  static propTypes = {
    extensionStore: PropTypes.object.isRequired,
  };

  get extensionStore() {
    return this.props.extensionStore;
  }

  handleToggle = (e) => {
    e.preventDefault();
    if (e.target === e.currentTarget ||
      e.target.matches && (
        e.target.matches('.name span') ||
        e.target.matches('.name') ||
        e.target.matches('.switch')
      )
    ) {
      this.extensionStore.setEnabled(!this.extensionStore.enabled);
    }
  };

  handleChange = (e) => {
    e.preventDefault();

    this.extensionStore.setEnabled(!this.extensionStore.enabled);
  };

  handleLaunch = (e) => {
    e.preventDefault();
    this.extensionStore.launch();
  };

  handleOptions = (e) => {
    e.preventDefault();
    this.extensionStore.openOptions();
  };

  handleUninstall = (e) => {
    e.preventDefault();
    this.extensionStore.uninstall();
  };

  render() {
    /**@type Extension*/
    const extensionStore = this.extensionStore;

    const classList = ['item extension'];
    if (extensionStore.isLoading) {
      classList.push('loading');
    }

    const actions = [];
    if (extensionStore.enabled) {
      if (extensionStore.launchType) {
        actions.push(
          <a key={'launch'}
             title={chrome.i18n.getMessage('launch')}
             href={'#launch'}
             className="btn launch"
             onClick={this.handleLaunch}/>
        );
      }
      if (extensionStore.optionsUrl) {
        actions.push(
          <a key={'options'}
             title={chrome.i18n.getMessage('options')}
             href={'#options'}
             className="btn options"
             onClick={this.handleOptions}/>
        );
      }
    }
    actions.push(
      <a key={'uninstall'}
         title={chrome.i18n.getMessage('uninstall')}
         href={'#uninstall'}
         className="btn remove"
         onClick={this.handleUninstall}/>
    );

    const enabledTitle = extensionStore.enabled ? chrome.i18n.getMessage('disable') : chrome.i18n.getMessage('enable');

    return (
      <div id={extensionStore.id}
           className={classList.join(' ')}
           onClick={this.handleToggle}
           title={extensionStore.descriptionTitle}>
        <div className="field switch">
          <input type="checkbox"
                 title={enabledTitle}
                 checked={extensionStore.enabled}
                 disabled={!extensionStore.mayDisable}
                 onChange={this.handleChange}/>
        </div>
        <div className="field icon" title={chrome.i18n.getMessage('move')}>
          <img src={extensionStore.icon19 || emptyIcon} alt=""/>
        </div>
        <div className="field name">
          <span>{extensionStore.name}</span>
        </div>
        <div className="field action">{actions}</div>
      </div>
    );
  }
}

export default Extension;