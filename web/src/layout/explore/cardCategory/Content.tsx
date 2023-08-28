import { orderBy } from 'lodash';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Waypoint } from 'react-waypoint';

import { BaseItem, CardMenu, Item } from '../../../types';
import convertStringSpaces from '../../../utils/convertStringSpaces';
import isElementInView from '../../../utils/isElementInView';
import { CategoriesData } from '../../../utils/prepareData';
import { AppContext, Context } from '../../context/AppContext';
import Card from './Card';
import styles from './Content.module.css';

interface Props {
  menu: CardMenu;
  data: CategoriesData;
  isVisible: boolean;
}
const Content = (props: Props) => {
  const navigate = useNavigate();
  const { updateActiveItemId } = useContext(AppContext) as Context;

  const sortItems = (firstCategory: string, firstSubcategory: string): BaseItem[] => {
    return orderBy(
      props.data[firstCategory][firstSubcategory].items,
      [(item: BaseItem) => item.name.toString()],
      'asc'
    );
  };

  const handleEnter = (id: string) => {
    if (`#${id}` !== location.hash) {
      navigate(
        { ...location, hash: id },
        {
          replace: true,
        }
      );

      if (!isElementInView(`btn_${id}`)) {
        const target = window.document.getElementById(`btn_${id}`);
        if (target) {
          target.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  };

  return (
    <>
      {Object.keys(props.menu).map((cat: string) => {
        return (
          <div key={`list_cat_${cat}`}>
            {props.menu[cat].map((subcat: string) => {
              const id = convertStringSpaces(`${cat}/${subcat}`);
              return (
                <Waypoint
                  key={`list_subcat_${subcat}`}
                  topOffset="3%"
                  bottomOffset="97%"
                  onEnter={() => handleEnter(id)}
                  fireOnRapidScroll={false}
                >
                  <div>
                    <div id={id} className={`fw-semibold p-2 mb-4 text-truncate w-100 ${styles.title}`}>
                      {cat} / {subcat}
                    </div>
                    <div className="row g-4 mb-4">
                      {sortItems(cat, subcat).map((item: Item) => {
                        return (
                          <div key={`card_${item.id}`} className="col-12 col-lg-6 col-xxl-4 col-xxxl-3">
                            <div
                              className={`card rounded-0 p-3 ${styles.card}`}
                              onClick={() => updateActiveItemId(item.id)}
                            >
                              <Card item={item} className="h-100" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Waypoint>
              );
            })}
          </div>
        );
      })}
    </>
  );
};

export default Content;
