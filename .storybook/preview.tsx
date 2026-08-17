import type {Preview} from '@storybook/react-vite';
import '../src/assets/css/popup.less';

const messages: Record<string, string> = {
  disable: 'Disable',
  edit: 'Edit',
  emptyTitle: 'No extensions found',
  enable: 'Enable',
  extensionType: 'Extensions',
  groupName: 'Group name',
  launch: 'Launch',
  loadError: 'Extensions could not be loaded',
  loading: 'Loading extensions…',
  move: 'Move',
  newGroup: 'New group',
  options: 'Options',
  removeGroup: 'Delete group',
  save: 'Save',
  themeType: 'Themes',
  uninstall: 'Uninstall',
  unknownType: 'Unknown',
};

const i18nMock = {
  getMessage: (key: string) => messages[key] ?? key,
};

if (typeof globalThis.chrome === 'undefined') {
  Object.defineProperty(globalThis, 'chrome', {
    configurable: true,
    value: {i18n: i18nMock} satisfies Partial<typeof chrome>,
  });
} else if (!globalThis.chrome.i18n) {
  Object.defineProperty(globalThis.chrome, 'i18n', {
    configurable: true,
    value: i18nMock,
  });
}

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="story-canvas">
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
};

export default preview;
