import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Footer from './navigation/Footer';
import Header from './navigation/Header';
import { BaseItem } from '../types';
import ItemModal from './common/itemModal';
import itemsDataGetter from '../utils/itemsDataGetter';
import NoData from './common/NoData';

interface Props {
  items: BaseItem[];
}

const Layout = (props: Props) => {
  const [activeItemId, setActiveItemId] = useState<string | undefined>();
  const [fullDataReady, setFullDataReady] = useState<boolean>(false);

  const onClickItem = (itemId: string) => {
    setActiveItemId(itemId);
  };

  const removeActiveItem = () => {
    setActiveItemId(undefined);
  };

  itemsDataGetter.isReady({
    updateStatus: (status: boolean) => setFullDataReady(status),
  });

  return (
    <div className="h-100 d-flex flex-column">
      <Header items={props.items} onClickItem={onClickItem} />
      <div className="d-flex flex-column flex-grow-1">
        <NoData className="d-block d-lg-none">
          <div className="fs-3">Mobile view is not ready yet!</div>
        </NoData>
        <main className="container-fluid px-4 d-none d-lg-block">
          <Outlet context={{ activeItemId, setActiveItemId }} />
        </main>
      </div>
      <Footer />
      <ItemModal fullDataReady={fullDataReady} activeItemId={activeItemId} removeActiveItem={removeActiveItem} />
    </div>
  );
};

export default Layout;
