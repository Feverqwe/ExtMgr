import './assets/css/popup.less';
import {createRoot} from 'react-dom/client';
import Popup from './pages/Popup';
import RootStore from './stores/RootStore';

const rootStore = new RootStore();
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Popup root element was not found');
}

window.rootStore = rootStore;

createRoot(rootElement).render(<Popup rootStore={rootStore} />);
