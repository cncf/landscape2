import { useLocation, useNavigate } from '@solidjs/router';
import { formatTAGName, SVGIcon, SVGIconKind } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, For, Show } from 'solid-js';

import { COLORS } from '../../../data';
import { CardMenu } from '../../../types';
import goToElement from '../../../utils/goToElement';
import buildNormalizedId from '../../../utils/normalizeId';
import styles from './Menu.module.css';

interface Props {
  menu: CardMenu;
  isVisible: boolean;
  sticky: boolean;
  onClickOption?: () => void;
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
        if (props.sticky && ref()!.clientHeight > document.getElementById('landscape')!.clientHeight) {
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
    <div class={`d-flex flex-column ${styles.toc}`} classList={{ [`sticky-top me-4 ${styles.sticky}`]: props.sticky }}>
      <div id="menu" classList={{ [`offcanvas-body ${styles.content}`]: offsetActive() && props.sticky }}>
        <div ref={setRef}>
          <For each={Object.keys(props.menu)}>
            {(title, index) => {
              const isTAG = title === 'Tag';
              return (
                <div>
                  <div
                    class="text-white border border-3 border-bottom-0 border-white fw-semibold p-2 text-truncate"
                    classList={{ 'border-top-0': index() === 0, 'text-uppercase': isTAG }}
                    style={{ 'background-color': bgColor }}
                  >
                    {title}
                  </div>

                  <div
                    class={`d-flex flex-column text-start border border-3 py-3 border-white ${styles.subcategories}`}
                    classList={{
                      'border-bottom-0': index() !== Object.keys(props.menu).length - 1,
                    }}
                  >
                    <For each={props.menu[title]}>
                      {(subtitle: string) => {
                        const hash = buildNormalizedId({ title: title, subtitle: subtitle, grouped: true });

                        return (
                          <button
                            id={`btn_${hash}`}
                            title={subtitle}
                            class={`position-relative btn btn-sm btn-link rounded-0 p-0 ps-3 pe-2 py-1 text-start text-truncate text-capitalize ${styles.subcategoryBtn}`}
                            classList={{
                              [`fw-bold ${styles.selected}`]: `#${hash}` === location.hash,
                            }}
                            disabled={`#${hash}` === location.hash}
                            onClick={() => {
                              goToElement(`card_${hash}`);
                              if (!isUndefined(props.onClickOption)) {
                                props.onClickOption();
                              }
                              updateRoute(hash);
                            }}
                            aria-label={subtitle === 'undefined' ? 'None' : subtitle}
                          >
                            <Show when={`#${hash}` === location.hash}>
                              <div class={`position-absolute ${styles.arrow}`}>
                                <SVGIcon kind={SVGIconKind.ArrowRight} />
                              </div>
                            </Show>
                            {subtitle === 'undefined' ? 'None' : isTAG ? formatTAGName(subtitle) : subtitle}
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
