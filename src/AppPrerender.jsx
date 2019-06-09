import './assets/css/popup.less';
import RootStore from "./stores/RootStore";
import ReactDOMServer from 'react-dom/server';
import React from 'react';
import {Provider} from 'mobx-react';
import Popup from "../src/pages/Popup";
import {useStaticRendering} from "mobx-react";

useStaticRendering(true);

export default (params) => {
  const /**RootStore*/rootStore = RootStore.create();

  const script = document.createElement('script');
  script.id = 'rootStore';
  script.type = 'application/json';
  script.textContent = `<!--${JSON.stringify(rootStore)}-->`;
  document.body.appendChild(script);

  return ReactDOMServer.renderToString(
    <Provider rootStore={rootStore}>
      <Popup/>
    </Provider>
  );
}