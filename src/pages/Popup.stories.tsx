import type {Meta, StoryObj} from '@storybook/react-vite';
import {PopupView} from './Popup';
import RootStore from '../stores/RootStore';

const createExtension = (
  id: string,
  name: string,
  enabled = true,
): chrome.management.ExtensionInfo => ({
  id,
  name,
  shortName: name,
  description: `${name} description`,
  version: '1.0.0',
  mayDisable: true,
  enabled,
  isApp: false,
  type: 'extension',
  offlineEnabled: true,
  optionsUrl: '',
  icons: [],
  permissions: [],
  hostPermissions: [],
  installType: 'normal',
  availableLaunchTypes: [],
});

const createStore = () => {
  const store = new RootStore({
    groups: [
      {id: 'development', name: 'Development', ids: ['devtools']},
      {id: 'writing', name: 'Writing', ids: ['formatter']},
    ],
    extensions: {
      devtools: createExtension('devtools', 'Developer Tools'),
      formatter: createExtension('formatter', 'Page Formatter', false),
    },
  });
  store.saveGroups = () => Promise.resolve();
  return store;
};

const meta: Meta<typeof PopupView> = {
  title: 'Popup/Drag and drop',
  component: PopupView,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const BetweenGroups: Story = {
  render: () => <PopupView rootStore={createStore()} />,
};
