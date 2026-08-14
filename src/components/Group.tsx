import {observer} from 'mobx-react';
import React from 'react';
import Extension from './Extension';
import type {ExtensionStoreInstance} from '../stores/ExtensionStore';

interface GroupStoreLike {
  id: string;
  name: string;
  computed?: string;
  isLoading: boolean;
  isChecked: boolean;
  extensions: readonly ExtensionStoreInstance[];
  setEnabled(enabled: boolean): Promise<void>;
  setName(name: string): void;
  save(): Promise<void> | void;
}

interface GroupProps {
  groupStore: GroupStoreLike;
}

interface GroupState {
  editing: boolean;
}

class Group extends React.PureComponent<GroupProps, GroupState> {
  state: GroupState = {
    editing: false,
  };

  form = React.createRef<HTMLFormElement>();

  get groupStore() {
    return this.props.groupStore;
  }

  handleEdit = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.setState({editing: true});
  };

  handleSave = (event: React.SyntheticEvent) => {
    event.preventDefault();
    const name = this.form.current?.elements.namedItem('name') as HTMLInputElement | null;

    if (name) {
      this.groupStore.setName(name.value);
      this.groupStore.save();
    }
    this.setState({editing: false});
  };

  handleToggle = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.target;

    if (
      target === event.currentTarget ||
      (target instanceof Element &&
        (target.matches('.name span') || target.matches('.name') || target.matches('.switch')))
    ) {
      this.groupStore.setEnabled(!this.groupStore.isChecked);
    }
  };

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    this.groupStore.setEnabled(!this.groupStore.isChecked);
  };

  render() {
    const {groupStore} = this;
    const extensions = groupStore.extensions.map((extension) => (
      <Extension key={extension.id} extensionStore={extension} />
    ));

    if (!extensions.length) {
      return null;
    }

    const headerClassNames = ['item group'];
    if (groupStore.isLoading) {
      headerClassNames.push('loading');
    }

    let name: React.ReactNode;
    if (this.state.editing) {
      headerClassNames.push('edit');
      name = (
        <form ref={this.form} onSubmit={this.handleSave}>
          <input name="name" defaultValue={groupStore.name} type="text" />
        </form>
      );
    } else {
      name = <span>{groupStore.name}</span>;
    }

    const actions: React.ReactNode[] = [];
    if (!groupStore.computed) {
      if (this.state.editing) {
        actions.push(
          <a
            key="save"
            title={chrome.i18n.getMessage('save')}
            href="#save"
            onClick={this.handleSave}
            className="btn save"
          />,
        );
      } else {
        actions.push(
          <a
            key="edit"
            title={chrome.i18n.getMessage('edit')}
            href="#edit"
            onClick={this.handleEdit}
            className="btn edit"
          />,
        );
      }
    }

    return (
      <>
        <div id={groupStore.id} className={headerClassNames.join(' ')} onClick={this.handleToggle}>
          <div className="field switch">
            <input type="checkbox" checked={groupStore.isChecked} onChange={this.handleChange} />
          </div>
          <div className="field name">{name}</div>
          <div className="field action">{actions}</div>
        </div>
        {extensions}
      </>
    );
  }
}

export default observer(Group);
