import { Outlet } from 'react-router-dom';

import { BaseItem } from '../types';
import ItemModal from './common/itemModal';
import NoData from './common/NoData';
import ZoomModal from './common/zoomModal';
import AppContextProvider from './context/AppContext';
import Footer from './navigation/Footer';
import Header from './navigation/Header';

interface Props {
  items: BaseItem[];
}

const Layout = (props: Props) => {
  return (
    <AppContextProvider>
      <div className="h-100 d-flex flex-column">
        <Header items={props.items} />
        <div className="d-flex flex-column flex-grow-1">
          <div className="d-block d-lg-none mx-5">
            <NoData>
              <div className="d-flex flex-column">
                <div className="fs-6 fw-semibold">This prototype hasn't been optimized for mobile devices yet.</div>
                <small className="my-3">But we are working on it and it'll be ready soon 😊</small>
              </div>
            </NoData>
          </div>
          <main className="container-fluid px-4 d-none d-lg-block">
            <Outlet />
          </main>
        </div>
        <Footer />
        <ItemModal />
        <ZoomModal />
      </div>
    </AppContextProvider>
  );
};

export default Layout;
