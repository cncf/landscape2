import './styles/bootstrap.scss';
import './App.css';
import './styles/cookies.css';

import { render } from 'solid-js/web';

import App from './App';

const root = document.getElementById('landscape');

render(() => <App />, root!);
