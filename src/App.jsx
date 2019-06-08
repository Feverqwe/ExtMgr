import './assets/css/popup.less';
import React from 'react';
import ReactDOM from 'react-dom';
import Popup from "./pages/Popup";
import RootStore from "./stores/RootStore";
import {Provider} from 'mobx-react';

const rootStore = RootStore.create(JSON.parse(document.getElementById('rootStore').innerHTML.slice(4, -3)));

window.rootStore = rootStore;

ReactDOM.hydrate(
  <Provider rootStore={rootStore}>
    <Popup/>
  </Provider>,
  document.getElementById('root')
);