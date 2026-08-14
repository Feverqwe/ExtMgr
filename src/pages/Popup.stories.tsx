import type {Meta, StoryObj} from '@storybook/react-vite';
import {PopupProvider} from '../context/PopupContext';
import {createPopupStoryData, popupStoryServices} from '../stories/popupFixtures';
import {PopupView} from './Popup';

const meta: Meta<typeof PopupView> = {
  title: 'Popup/Drag and drop',
  component: PopupView,
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
