import {DndContext} from '@dnd-kit/core';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {userEvent, within} from 'storybook/test';
import {PopupProvider, type PopupInitialData} from '../context/PopupContext';
import {createExtension, popupStoryServices} from '../stories/popupFixtures';
import Group from './Group';

const createData = (secondExtensionEnabled: boolean): PopupInitialData => ({
  groups: [
    {
      id: 'development',
      name: 'Development',
      ids: ['devtools', 'formatter'],
    },
  ],
  extensions: {
    devtools: {
      ...createExtension('devtools', 'Developer Tools'),
      shortName: 'DevTools',
      description: 'Developer utilities',
      version: '2.4.0',
      optionsUrl: 'chrome-extension://devtools/options.html',
      permissions: ['storage'],
    },
    formatter: {
      ...createExtension('formatter', 'Page Formatter', secondExtensionEnabled),
      shortName: 'Formatter',
      description: 'Formats the current page',
      version: '1.8.2',
      permissions: ['activeTab'],
    },
  },
});

const renderGroup = (secondExtensionEnabled: boolean) => (
  <PopupProvider
    initialData={createData(secondExtensionEnabled)}
    initialize={false}
    services={popupStoryServices}
  >
    <div className="groups">
      <DndContext>
        <Group groupId="development" />
      </DndContext>
    </div>
  </PopupProvider>
);

const meta: Meta<typeof Group> = {
  title: 'Popup/Group',
  component: Group,
  parameters: {layout: 'fullscreen'},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Enabled: Story = {
  render: () => renderGroup(true),
};

export const PartiallyDisabled: Story = {
  render: () => renderGroup(false),
};

export const Editing: Story = {
  render: () => renderGroup(true),
  play: async ({canvasElement}) => {
    await userEvent.click(within(canvasElement).getByRole('button', {name: 'Edit: Development'}));
  },
};
