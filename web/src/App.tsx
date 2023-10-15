import './styles/default.scss';
import './App.css';

import { Route, Router, Routes } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import range from 'lodash/range';
import { createSignal, onMount } from 'solid-js';

import Layout from './layout';
import Explore from './layout/explore';
import Guide from './layout/guide';
import NotFound from './layout/notFound';
import Stats from './layout/stats';
import itemsDataGetter from './utils/itemsDataGetter';
import updateAlphaInColor from './utils/updateAlphaInColor';

// Colors
let COLOR_1 = 'rgba(0, 107, 204, 1)';
let COLOR_1_HOVER = 'rgba(0, 107, 204, 0.75)';
let COLOR_2 = 'rgba(255, 0, 170, 1)';
let COLOR_3 = 'rgba(96, 149, 214, 1)';
let COLOR_4 = 'rgba(0, 42, 81, 0.7)';
let COLOR_5 = 'rgba(1, 107, 204, 0.7)';
let COLOR_6 = 'rgba(0, 42, 81, 0.7)';

const App = () => {
  const [data] = createSignal(window.baseDS);

  onMount(() => {
    if (!isUndefined(window.baseDS.colors)) {
      if (!isUndefined(window.baseDS.colors?.color1)) {
        COLOR_1 = window.baseDS.colors?.color1;
        COLOR_1_HOVER = updateAlphaInColor(COLOR_1, 0.75);
      }
      if (!isUndefined(window.baseDS.colors?.color2)) {
        COLOR_2 = window.baseDS.colors?.color2;
      }
      if (!isUndefined(window.baseDS.colors?.color3)) {
        COLOR_3 = window.baseDS.colors?.color3;
      }
      if (!isUndefined(window.baseDS.colors?.color4)) {
        COLOR_4 = window.baseDS.colors?.color4;
      }
      if (!isUndefined(window.baseDS.colors?.color5)) {
        COLOR_5 = window.baseDS.colors?.color5;
      }
      if (!isUndefined(window.baseDS.colors?.color6)) {
        COLOR_6 = window.baseDS.colors?.color6;
      }
    }

    const loadColors = () => {
      const colors = [COLOR_1, COLOR_2, COLOR_3, COLOR_4, COLOR_5, COLOR_6];
      range(colors.length).forEach((i: number) => {
        document.documentElement.style.setProperty(`--color${i + 1}`, colors[i]);
      });
      document.documentElement.style.setProperty('--color1-hover', COLOR_1_HOVER);
    };

    loadColors();
    itemsDataGetter.init();
  });

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout data={data()} />}>
          <Route path="/" element={<Explore initialData={data()} />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
