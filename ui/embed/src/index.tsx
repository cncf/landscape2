import { render } from 'solid-js/web';
import { setup, shouldForwardProp } from 'solid-styled-components';

import App from './App';
import GlobalStyles from './styles/GlobalStyles';
import { EMBED_STYLE_PROPS } from './styles/styleProps';

const MOUNT_NODE_ID = 'landscape-embeddable-view';

const root = document.getElementById(MOUNT_NODE_ID);
if (!root) {
  throw new Error(`Landscape embed mount node #${MOUNT_NODE_ID} not found`);
}

// Keep the props the styled components only use for their styles off the DOM
setup(
  null,
  shouldForwardProp((prop) => !EMBED_STYLE_PROPS.has(prop))
);

render(
  () => (
    <>
      <GlobalStyles />
      <App />
    </>
  ),
  root
);
