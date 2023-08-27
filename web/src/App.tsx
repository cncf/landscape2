import './styles/default.scss';
import './App.css';

import { isNull, isUndefined } from 'lodash';
import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Layout from './layout';
import Landscape from './layout/explore';
import Guide from './layout/guide';
import NotFound from './layout/notFound';
import itemsDataGetter from './utils/itemsDataGetter';

const App = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (window as any).baseDS;

  useEffect(() => {
    itemsDataGetter.init();
  }, []);

  if (isNull(data) || isUndefined(data)) return null;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout items={data.items} />}>
          <Route index element={<Landscape data={data} />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
