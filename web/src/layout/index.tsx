import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Footer from './navigation/Footer';
import Header from './navigation/Header';
import { BaseItem } from '../types';
import ItemModal from './common/ItemModal';

interface Props {
  items: BaseItem[];
}

const Layout = (props: Props) => {
  const [activeItemId, setActiveItemId] = useState<string | undefined>();

  const onClickItem = (itemId: string) => {
    setActiveItemId(itemId);
  };

  const removeActiveItem = () => {
    setActiveItemId(undefined);
  };

  return (
    <div className="h-100 d-flex flex-column">
      <Header items={props.items} onClickItem={onClickItem} />
      <div className="d-flex flex-column flex-grow-1">
        <main className="container-fluid px-4">
          <Outlet context={{ activeItemId, setActiveItemId }} />
        </main>
      </div>
      <Footer />
      <ItemModal activeItemId={activeItemId} removeActiveItem={removeActiveItem} />
    </div>
  );
};

export default Layout;
