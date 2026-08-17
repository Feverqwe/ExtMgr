import type {Meta, StoryObj} from '@storybook/react-vite';
import {PopupProvider} from '../context/PopupContext';
import type {PopupServices} from '../context/chromePopupServices';
import {createExtension, createPopupStoryData, popupStoryServices} from '../stories/popupFixtures';
import {PopupView} from './Popup';

const meta: Meta<typeof PopupView> = {
  title: 'Popup/Drag and drop',
  component: PopupView,
  parameters: {layout: 'fullscreen'},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const BetweenGroups: Story = {
  render: () => (
    <PopupProvider
      initialData={createPopupStoryData()}
      initialize={false}
      services={popupStoryServices}
    >
      <PopupView />
    </PopupProvider>
  ),
};

export const ComputedGroupInteractions: Story = {
  render: () => (
    <PopupProvider
      initialData={{
        groups: [],
        computedOrder: {extension: ['second', 'first']},
        extensions: {
          first: createExtension('first', 'First Extension'),
          second: createExtension('second', 'Second Extension'),
          new: createExtension('new', 'New Extension'),
        },
      }}
      initialize={false}
      services={popupStoryServices}
    >
      <PopupView />
    </PopupProvider>
  ),
};

export const RichActionsAndLongNames: Story = {
  render: () => (
    <PopupProvider
      initialData={{
        groups: [
          {
            id: 'everyday',
            name: 'Everyday toolkit',
            ids: ['capture', 'privacy', 'locked'],
          },
        ],
        extensions: {
          capture: {
            ...createExtension('capture', 'Full-page Capture & Annotation Studio'),
            optionsUrl: 'chrome-extension://capture/options.html',
          },
          privacy: createExtension('privacy', 'Privacy Guard', false),
          locked: {
            ...createExtension('locked', 'Managed by your organization'),
            mayDisable: false,
          },
        },
      }}
      initialize={false}
      services={popupStoryServices}
    >
      <PopupView />
    </PopupProvider>
  ),
};

export const Empty: Story = {
  render: () => (
    <PopupProvider
      initialData={{groups: [], extensions: {}}}
      initialize={false}
      services={popupStoryServices}
    >
      <PopupView />
    </PopupProvider>
  ),
};

const pendingServices: PopupServices = {
  ...popupStoryServices,
  getExtensions: () => new Promise(() => undefined),
  loadGroups: () => new Promise(() => undefined),
};

export const Loading: Story = {
  render: () => (
    <PopupProvider initialize services={pendingServices}>
      <PopupView />
    </PopupProvider>
  ),
};

const errorServices: PopupServices = {
  ...popupStoryServices,
  getExtensions: () => Promise.reject(new Error('Story initialization failed')),
};

export const InitializationError: Story = {
  render: () => (
    <PopupProvider initialize services={errorServices}>
      <PopupView />
    </PopupProvider>
  ),
};
