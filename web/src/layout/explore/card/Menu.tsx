import { useLocation, useNavigate } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import { Accessor, createEffect, createSignal, For } from 'solid-js';

import { COLORS } from '../../../data';
import { CardMenu, SVGIconKind } from '../../../types';
import convertStringSpaces from '../../../utils/convertStringSpaces';
import goToElement from '../../../utils/goToElement';
import SVGIcon from '../../common/SVGIcon';
import styles from './Menu.module.css';

interface Props {
  menu: Accessor<CardMenu>;
  isVisible: boolean;
}

const Menu = (props: Props) => {
  const bgColor = COLORS[0];
  const navigate = useNavigate();
  const location = useLocation();
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [offsetActive, setOffsetActive] = createSignal<boolean>(false);

  createEffect(() => {
    if (props.isVisible) {
      if (!isUndefined(ref())) {
        if (ref()!.clientHeight > document.getElementById('landscape')!.clientHeight) {
          setOffsetActive(true);
        } else {
          setOffsetActive(false);
        }
      }
    }
  });

  const updateRoute = (hash: string) => {
    navigate(`${location.pathname}${location.search}#${hash}`, {
      replace: true,
      scroll: false,
      state: { fromMenu: true },
    });
  };

  return (
    <div class={`d-flex flex-column me-4 sticky-top ${styles.toc}`}>
      <div id="menu" classList={{ [`overflow-y-auto ${styles.content}`]: offsetActive() }}>
        <div ref={setRef}>
          <For each={Object.keys(props.menu())}>
            {(cat, index) => {
              return (
                <div>
                  <div
                    class="text-white border border-3 border-bottom-0 border-white fw-semibold p-2"
                    classList={{ 'border-top-0': index() === 0 }}
                    style={{ 'background-color': bgColor }}
                  >
                    {cat}
                  </div>

                  <div
                    class={`d-flex flex-column text-start border border-3 py-3 border-white ${styles.subcategories}`}
                    classList={{
                      'border-bottom-0': index() !== Object.keys(props.menu()).length - 1,
                    }}
                  >
                    <For each={props.menu()[cat]}>
                      {(subcat: string) => {
                        const hash = `${convertStringSpaces(cat)}/${convertStringSpaces(subcat)}`;

                        return (
                          <button
                            id={`btn_${hash}`}
                            title={subcat}
                            class={`position-relative btn btn-sm btn-link rounded-0 p-0 ps-3 pe-2 py-1 text-start text-truncate ${styles.subcategoryBtn}`}
                            classList={{
                              [`fw-bold ${styles.selected}`]: `#${hash}` === location.hash,
                            }}
                            disabled={`#${hash}` === location.hash}
                            onClick={() => {
                              goToElement(hash, 16);
                              updateRoute(hash);
                            }}
                          >
                            {`#${hash}` === location.hash && (
                              <div class={`position-absolute ${styles.arrow}`}>
                                <SVGIcon kind={SVGIconKind.ArrowRight} />
                              </div>
                            )}
                            {subcat}
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};

export default Menu;
