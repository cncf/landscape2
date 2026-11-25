import { useLocation, useNavigate } from '@solidjs/router';
import { SVGIcon, SVGIconKind } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js';

import { COLORS } from '../../../data';
import { CardMenu } from '../../../types';
import { getAnchorId } from '../../../utils/anchorIds';
import getSectionLabel from '../../../utils/getSectionLabel';
import goToElement from '../../../utils/goToElement';
import { parseHashId } from '../../../utils/urlParams';
import styles from './Menu.module.css';

// Space kept between the bottom of the sticky menu and the footer or the viewport
const MENU_BOTTOM_MARGIN = 16;
// Smallest max-height of the sticky menu
const MENU_MIN_HEIGHT = 200;
// Room the landscape keeps besides the menu before the menu scrolls internally
const MENU_OFFSET_BUFFER = 120;

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
  const [root, setRoot] = createSignal<HTMLDivElement>();
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [offsetActive, setOffsetActive] = createSignal<boolean>(false);
  // Section id the URL hash names
  const selectedId = createMemo(() => parseHashId(location.hash));

  // Effect to manage menu height based on footer visibility and scroll position.
  // Prevents the sticky menu from sliding under the header when footer is visible
  // by dynamically adjusting the menu's max-height to fit between header & footer.
  createEffect(() => {
    if (props.isVisible && props.sticky) {
      const footer = document.querySelector('footer[role="contentinfo"]');
      const landscapeEl = document.getElementById('landscape');
      const menuRoot = root();

      if (!footer || !landscapeEl || !menuRoot) return;

      const updateMenuHeight = () => {
        const menuElement = ref();
        if (!menuElement) return;

        // Read every layout value before writing, so the update causes no forced reflow
        const footerRect = footer.getBoundingClientRect();
        // Menu's actual position in the DOM (accounts for header, MOTD, overlay, filters and spacing)
        const menuTop = menuElement.getBoundingClientRect().top;
        const menuContentHeight = menuElement.scrollHeight;
        const landscapeHeight = landscapeEl.clientHeight;
        const viewportHeight = window.innerHeight;

        // Calculate available space from menu's actual position
        let maxHeight;
        if (footerRect.top > 0 && footerRect.top < viewportHeight) {
          // Footer visible: constrain between menu position and footer
          const spaceToFooter = footerRect.top - menuTop - MENU_BOTTOM_MARGIN;
          const spaceToViewportBottom = viewportHeight - menuTop - MENU_BOTTOM_MARGIN;
          maxHeight = Math.max(MENU_MIN_HEIGHT, Math.min(spaceToFooter, spaceToViewportBottom));
        } else {
          // Footer not visible: use space to viewport bottom
          maxHeight = Math.max(MENU_MIN_HEIGHT, viewportHeight - menuTop - MENU_BOTTOM_MARGIN);
        }

        // The max-height belongs to this menu only
        menuRoot.style.setProperty('--menu-max-height', `${maxHeight}px`);

        // The menu scrolls internally when its content is taller than the space it gets
        const effectiveHeight = Math.min(maxHeight, landscapeHeight - MENU_OFFSET_BUFFER);
        setOffsetActive(menuContentHeight > effectiveHeight);
      };

      // Scroll and resize events update the height at most once per frame
      let frame: number | undefined;
      const scheduleUpdate = () => {
        if (frame !== undefined) return;
        frame = requestAnimationFrame(() => {
          frame = undefined;
          updateMenuHeight();
        });
      };

      landscapeEl.addEventListener('scroll', scheduleUpdate);
      window.addEventListener('resize', scheduleUpdate);

      // Run initial calculation
      updateMenuHeight();

      // Cleanup: remove listeners, cancel the pending frame and reset the max-height
      onCleanup(() => {
        landscapeEl.removeEventListener('scroll', scheduleUpdate);
        window.removeEventListener('resize', scheduleUpdate);
        if (frame !== undefined) {
          cancelAnimationFrame(frame);
        }
        menuRoot.style.removeProperty('--menu-max-height');
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

  // Menu sections whose entries resolve to an anchor id
  const visibleSections = createMemo(() =>
    Object.entries(props.menu)
      .map(([title, subtitles]) => ({
        title,
        entries: subtitles
          .map((subtitle) => ({ subtitle, hash: getAnchorId({ title, subtitle, grouped: true }) }))
          .filter((entry): entry is { subtitle: string; hash: string } => !isUndefined(entry.hash)),
      }))
      .filter((section) => section.entries.length > 0)
  );

  return (
    <div
      ref={setRoot}
      class={`d-flex flex-column ${styles.toc}`}
      classList={{ [`sticky-top me-4 ${styles.sticky}`]: props.sticky }}
    >
      <div id="menu" classList={{ [`offcanvas-body ${styles.content}`]: offsetActive() && props.sticky }}>
        <div ref={setRef}>
          <For each={visibleSections()}>
            {(section, index) => {
              const isTAG = section.title === 'Tag';
              return (
                <div>
                  <div
                    class="text-white border border-3 border-bottom-0 border-white fw-semibold p-2 text-truncate"
                    classList={{ 'border-top-0': index() === 0, 'text-uppercase': isTAG }}
                    style={{ 'background-color': bgColor }}
                  >
                    {section.title}
                  </div>

                  <div
                    class={`d-flex flex-column text-start border border-3 py-3 border-white ${styles.subcategories}`}
                    classList={{
                      'border-bottom-0': index() !== visibleSections().length - 1,
                    }}
                  >
                    <For each={section.entries}>
                      {({ subtitle, hash }) => (
                        <button
                          id={`btn_${hash}`}
                          title={subtitle}
                          class={`position-relative btn btn-sm btn-link rounded-0 p-0 ps-3 pe-2 py-1 text-start text-truncate text-capitalize ${styles.subcategoryBtn}`}
                          classList={{
                            [`fw-bold ${styles.selected}`]: hash === selectedId(),
                          }}
                          disabled={hash === selectedId()}
                          onClick={() => {
                            goToElement(`card_${hash}`);
                            if (!isUndefined(props.onClickOption)) {
                              props.onClickOption();
                            }
                            updateRoute(hash);
                          }}
                          aria-label={getSectionLabel(subtitle, isTAG)}
                        >
                          <Show when={hash === selectedId()}>
                            <div class={`position-absolute ${styles.arrow}`}>
                              <SVGIcon kind={SVGIconKind.ArrowRight} />
                            </div>
                          </Show>
                          {getSectionLabel(subtitle, isTAG)}
                        </button>
                      )}
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
