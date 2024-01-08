import { Route, Router } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import range from 'lodash/range';
import { createSignal, onMount } from 'solid-js';

import Layout from './layout';
import Explore from './layout/explore';
import Finances from './layout/finances';
import Guide from './layout/guide';
import Logos from './layout/logos';
import NotFound from './layout/notFound';
import Screenshots from './layout/screenshots';
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
    <Router root={Layout}>
      <Route path={['/', '/embed-setup']} component={() => <Explore initialData={data()} />} />
      <Route path="/guide" component={Guide} />
      <Route path="/stats" component={Stats} />
      <Route path="/finances" component={Finances} />
      <Route path="/screenshot" component={() => <Screenshots initialData={data()} />} />
      <Route path="/logos-preview" component={Logos} />
      <Route path="*" component={NotFound} />
    </Router>
  );
};

export default App;
