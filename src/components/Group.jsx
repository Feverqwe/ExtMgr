import {observer} from "mobx-react";
import React from "react";
import PropTypes from 'prop-types';
import Extension from "./Extension";

@observer
class Group extends React.PureComponent {
  static propTypes = {
    groupStore: PropTypes.object.isRequired,
  };

  state = {
    editing: false
  };

  /**@return {GroupStore}*/
  get groupStore() {
    return this.props.groupStore;
  }

  handleEdit = (e) => {
    e.preventDefault();
    this.setState({
      editing: true
    });
  };

  form = React.createRef();
  handleSave = (e) => {
    e.preventDefault();
    const name = this.form.current.elements.name;
    this.groupStore.setName(name.value);
    this.groupStore.save();
    this.setState({
      editing: false
    });
  };

  body = React.createRef();
  handleToggle = (e) => {
    e.preventDefault();
    if (e.target === this.body.current ||
      e.target.matches && (
        e.target.matches('.name span') ||
        e.target.matches('.name') ||
        e.target.matches('.switch')
      )
    ) {
      this.groupStore.setEnabled(!this.groupStore.isChecked);
    }
  };

  handleChange = (e) => {
    e.preventDefault();
    this.groupStore.setEnabled(!this.groupStore.isChecked);
  };

  render() {
    const groupStore = this.groupStore;
    const extensions = groupStore.extensions.map(extension => {
      return <Extension key={extension.id} extensionStore={extension}/>
    });

    if (!extensions.length) {
      return null;
    }

    const headerClassList = ['item group'];
    if (groupStore.isLoading) {
      headerClassList.push('loading');
    }
    let name = null;
    if (this.state.editing) {
      headerClassList.push('edit');
      name = (
        <form ref={this.form} onSubmit={this.handleSave}>
          <input name="name" defaultValue={groupStore.name} type={'text'}/>
        </form>
      );
    } else {
      name = (
        <span>{groupStore.name}</span>
      );
    }

    const actions = [];
    if (!groupStore.computed) {
      if (this.state.editing) {
        actions.push(
          <a key={'save'}
             title={chrome.i18n.getMessage('save')}
             href={'#save'}
             onClick={this.handleSave}
             className="btn save"/>
        );
      } else {
        actions.push(
          <a key={'edit'}
             title={chrome.i18n.getMessage('edit')}
             href={'#edit'}
             onClick={this.handleEdit}
             className="btn edit"/>
        );
      }
    }

    return (
      <>
        <div ref={this.body} key={groupStore.id} id={groupStore.id} className={headerClassList.join(' ')} onClick={this.handleToggle}>
          <div className="field switch">
            <input type="checkbox" checked={groupStore.isChecked} onChange={this.handleChange}/>
          </div>
          <div className="field name">{name}</div>
          <div className="field action">{actions}</div>
        </div>
        {extensions}
      </>
    );
  }
}

export default Group;