import { render } from 'solid-js/web';

import App from './App';
import GlobalStyles from './styles/GlobalStyles';

const root = document.getElementById('landscape-embeddable-view');

render(
  () => (
    <>
      <GlobalStyles />
      <App />
    </>
  ),
  root!
);
