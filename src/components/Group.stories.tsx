import type {Meta, StoryObj} from '@storybook/react-vite';
import React from 'react';
import Group from './Group';
import RootStore from '../stores/RootStore';

const createStore = (secondExtensionEnabled: boolean) =>
  RootStore.create({
    groups: [
      {
        id: 'development',
        name: 'Development',
        ids: ['devtools', 'formatter'],
      },
    ],
    extensions: {
      devtools: {
        id: 'devtools',
        name: 'Developer Tools',
        description: 'Developer utilities',
        version: '2.4.0',
        mayDisable: true,
        enabled: true,
        type: 'extension',
        offlineEnabled: true,
        optionsUrl: 'chrome-extension://devtools/options.html',
        icons: [],
        permissions: ['storage'],
        hostPermissions: [],
        installType: 'normal',
        availableLaunchTypes: [],
      },
      formatter: {
        id: 'formatter',
        name: 'Page Formatter',
        description: 'Formats the current page',
        version: '1.8.2',
        mayDisable: true,
        enabled: secondExtensionEnabled,
        type: 'extension',
        offlineEnabled: true,
        optionsUrl: '',
        icons: [],
        permissions: ['activeTab'],
        hostPermissions: [],
        installType: 'normal',
        availableLaunchTypes: [],
      },
    },
  });

const meta: Meta<typeof Group> = {
  title: 'Popup/Group',
  component: Group,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Enabled: Story = {
  render: () => {
    const store = createStore(true);
    return <Group groupStore={store.groups[0]} />;
  },
};

export const PartiallyDisabled: Story = {
  render: () => {
    const store = createStore(false);
    return <Group groupStore={store.groups[0]} />;
  },
};
