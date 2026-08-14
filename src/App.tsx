import './assets/css/popup.less';
import React from 'react';
import ReactDOM from 'react-dom';
import Popup from './pages/Popup';
import RootStore from './stores/RootStore';
import {Provider} from 'mobx-react';

const rootStore = RootStore.create();

window.rootStore = rootStore;

ReactDOM.render(
  <Provider rootStore={rootStore}>
    <Popup />
  </Provider>,
  document.getElementById('root'),
);
