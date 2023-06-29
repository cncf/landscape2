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
  const [activeItem, setActiveItem] = useState<BaseItem | undefined>();

  const onClickItem = (item: BaseItem) => {
    setActiveItem(item);
  };

  const removeActiveItem = () => {
    setActiveItem(undefined);
  };

  return (
    <div className="h-100 d-flex flex-column">
      <Header items={props.items} onClickItem={onClickItem} />
      <div className="d-flex flex-column flex-grow-1">
        <main className="container-fluid px-4">
          <Outlet context={{ activeItem, setActiveItem }} />
        </main>
      </div>
      <Footer />
      <ItemModal activeItem={activeItem} removeActiveItem={removeActiveItem} />
    </div>
  );
};

export default Layout;
