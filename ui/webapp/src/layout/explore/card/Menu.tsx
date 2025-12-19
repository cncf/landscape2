import { useLocation, useNavigate } from '@solidjs/router';
import { formatTAGName, SVGIcon, SVGIconKind } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';

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

  // Effect to manage menu height based on footer visibility and scroll position.
  // Prevents the sticky menu from sliding under the header when footer is visible
  // by dynamically adjusting the menu's max-height to fit between header & footer.
  createEffect(() => {
    if (props.isVisible && props.sticky) {
      const footer = document.querySelector('footer[role="contentinfo"]');
      const landscapeEl = document.getElementById('landscape');

      if (!footer || !landscapeEl) return;

      const updateMenuHeight = () => {
        const menuElement = ref();
        if (!menuElement) return;

        const footerRect = footer.getBoundingClientRect();
        const menuRect = menuElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const bottomMargin = 16;

        // Get menu's actual position from the DOM (accounts for header, MOTD,
        // overlay, filters, and any spacing)
        const menuTop = menuRect.top;

        // Calculate available space from menu's actual position
        let maxHeight;
        if (footerRect.top > 0 && footerRect.top < viewportHeight) {
          // Footer visible: constrain between menu position and footer
          const spaceToFooter = footerRect.top - menuTop - bottomMargin;
          const spaceToViewportBottom = viewportHeight - menuTop - bottomMargin;
          maxHeight = Math.max(200, Math.min(spaceToFooter, spaceToViewportBottom));
        } else {
          // Footer not visible: use space to viewport bottom
          maxHeight = Math.max(200, viewportHeight - menuTop - bottomMargin);
        }

        // Set CSS custom property for dynamic max-height
        document.documentElement.style.setProperty('--menu-max-height', `${maxHeight}px`);

        // Determine if menu needs internal scrolling (offsetActive)
        const landscapeHeight = landscapeEl.clientHeight;
        const MENU_OFFSET_BUFFER = 120;
        const effectiveHeight = Math.min(maxHeight, landscapeHeight - MENU_OFFSET_BUFFER);

        // Use scrollHeight (content height) vs effectiveHeight
        if (menuElement.scrollHeight > effectiveHeight) {
          setOffsetActive(true);
        } else {
          setOffsetActive(false);
        }
      };

      // Update menu height on scroll to continuously adjust as footer approaches
      const handleScroll = () => {
        updateMenuHeight();
      };

      // Update menu height on window resize to handle viewport changes
      const handleResize = () => {
        updateMenuHeight();
      };

      // Set up event listeners
      landscapeEl.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);

      // Run initial calculation
      updateMenuHeight();

      // Cleanup on unmount: remove listeners and reset CSS custom property
      onCleanup(() => {
        landscapeEl.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        document.documentElement.style.removeProperty('--menu-max-height');
      });
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
