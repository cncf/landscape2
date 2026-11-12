import { render } from 'solid-js/web';

import App from './App';

const MOUNT_NODE_ID = 'landscape-embeddable-item-view';

const root = document.getElementById(MOUNT_NODE_ID);
if (!root) {
  throw new Error(`Landscape embed item mount node #${MOUNT_NODE_ID} not found`);
}

render(() => <App />, root);
