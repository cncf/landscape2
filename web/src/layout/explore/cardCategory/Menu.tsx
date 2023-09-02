import classNames from 'classnames';
import { isUndefined } from 'lodash';
import { useRef } from 'react';
import { useNavigate } from 'react-router';

import { COLORS } from '../../../data';
import { CardMenu, SVGIconKind } from '../../../types';
import convertStringSpaces from '../../../utils/convertStringSpaces';
import goToElement from '../../../utils/goToElement';
import SVGIcon from '../../common/SVGIcon';
import styles from './Menu.module.css';

interface Props {
  menu?: CardMenu;
}

const Menu = (props: Props) => {
  const bgColor = COLORS[0];
  const navigate = useNavigate();
  const menu = useRef<HTMLDivElement>(null);

  const updateRoute = (hash: string) => {
    navigate(
      { ...location, hash: hash },
      {
        replace: true,
      }
    );
  };

  if (isUndefined(props.menu)) return null;

  return (
    <div>
      <div className={`d-flex flex-column me-4 sticky-top ${styles.toc}`}>
        <div id="menu" className={`offcanvas-body ${styles.content}`}>
          <div ref={menu}>
            {Object.keys(props.menu).map((cat: string, index: number) => {
              const categories = !isUndefined(props.menu) ? props.menu[cat] : [];

              return (
                <div key={`cat_${cat}`}>
                  <div
                    className={classNames('text-white border border-3 border-bottom-0 border-white fw-semibold p-2', {
                      'border-top-0': index === 0,
                    })}
                    style={{ backgroundColor: bgColor }}
                  >
                    {cat}
                  </div>

                  <div
                    className={classNames(
                      'd-flex flex-column text-start border border-3 py-3 border-white',
                      styles.subcategories,
                      {
                        'border-bottom-0': props.menu && index !== Object.keys(props.menu).length - 1,
                      }
                    )}
                  >
                    {categories.map((subcat: string) => {
                      const hash = `${convertStringSpaces(cat)}/${convertStringSpaces(subcat)}`;
                      const isSelected = `#${hash}` === location.hash;

                      return (
                        <button
                          key={`subcat_${subcat}`}
                          id={`btn_${hash}`}
                          title={subcat}
                          className={classNames(
                            'position-relative btn btn-sm btn-link rounded-0 p-0 ps-3 pe-2 py-1 text-start text-truncate',
                            styles.subcategoryBtn,
                            { [`fw-bold ${styles.selected}`]: isSelected }
                          )}
                          disabled={isSelected}
                          onClick={() => {
                            goToElement(hash, 16);
                            updateRoute(hash);
                          }}
                        >
                          {isSelected && (
                            <div className={`position-absolute ${styles.arrow}`}>
                              <SVGIcon kind={SVGIconKind.ArrowRight} />
                            </div>
                          )}
                          {subcat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
