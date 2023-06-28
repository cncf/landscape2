import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Footer from './navigation/Footer';
import Header from './navigation/Header';
import { Item } from '../types';
import ItemModal from './landscape/ItemModal';

interface Props {
  items: Item[];
}

const Layout = (props: Props) => {
  const [activeItem, setActiveItem] = useState<Item | undefined>();

  const onClickItem = (item: Item) => {
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
