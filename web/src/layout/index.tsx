import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { BaseItem } from '../types';
import ItemModal from './common/itemModal';
import NoData from './common/NoData';
import Footer from './navigation/Footer';
import Header from './navigation/Header';

interface Props {
  items: BaseItem[];
}

const Layout = (props: Props) => {
  const [activeItemId, setActiveItemId] = useState<string | undefined>();

  const onClickItem = useCallback((itemId: string) => {
    setActiveItemId(itemId);
  }, []);

  const removeActiveItem = useCallback(() => {
    setActiveItemId(undefined);
  }, []);

  return (
    <div className="h-100 d-flex flex-column">
      <Header items={props.items} onClickItem={onClickItem} />
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
          <Outlet context={{ activeItemId, setActiveItemId }} />
        </main>
      </div>
      <Footer />
      <ItemModal activeItemId={activeItemId} removeActiveItem={removeActiveItem} />
    </div>
  );
};

export default Layout;
