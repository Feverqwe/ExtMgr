import type {Preview} from '@storybook/react-vite';
import React from 'react';
import '../src/assets/css/popup.less';

const messages: Record<string, string> = {
  disable: 'Disable',
  edit: 'Edit',
  enable: 'Enable',
  launch: 'Launch',
  move: 'Move',
  options: 'Options',
  save: 'Save',
  uninstall: 'Uninstall',
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
      <div className="groups">
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
