import './assets/css/popup.less';
import {createRoot} from 'react-dom/client';
import {PopupProvider} from './context/PopupContext';
import Popup from './pages/Popup';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Popup root element was not found');
}

createRoot(rootElement).render(
  <PopupProvider>
    <Popup />
  </PopupProvider>,
);
