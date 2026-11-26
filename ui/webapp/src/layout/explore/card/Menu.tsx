import { useLocation, useNavigate } from '@solidjs/router';
import { SVGIcon, SVGIconKind } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show, untrack } from 'solid-js';

import { COLORS } from '../../../data';
import { CardMenu } from '../../../types';
import { getAnchorId } from '../../../utils/anchorIds';
import getSectionLabel from '../../../utils/getSectionLabel';
import goToElement from '../../../utils/goToElement';
import { parseHashId } from '../../../utils/urlParams';
import styles from './Menu.module.css';

// Space kept between the bottom of the sticky menu and the footer or the viewport
const MENU_BOTTOM_MARGIN = 16;
// Smallest max-height of the sticky menu when the footer is not in view
const MENU_MIN_HEIGHT = 200;

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
  const [content, setContent] = createSignal<HTMLDivElement>();
  const [isScrollable, setIsScrollable] = createSignal<boolean>(false);
  // Section id the URL hash names
  const selectedId = createMemo(() => parseHashId(location.hash));

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

  // Effect to manage menu height based on footer visibility and scroll position.
  // Prevents the sticky menu from sliding under the header when footer is visible
  // by dynamically adjusting the menu's max-height to fit between header & footer.
  createEffect(() => {
    if (!props.isVisible || !props.sticky) {
      setIsScrollable(false);
      return;
    }

    const footer = document.querySelector('footer[role="contentinfo"]');
    const landscapeEl = document.getElementById('landscape');
    const menuRoot = root();
    const menuContent = content();

    if (!footer || !landscapeEl || !menuRoot || !menuContent) return;

    let lastMaxHeight: number | undefined;

    const updateMenuHeight = () => {
      // Read every layout value before writing, so the update causes no forced reflow
      const footerRect = footer.getBoundingClientRect();
      const footerMarginTop = Number.parseFloat(getComputedStyle(footer).marginTop);
      const rootTop = menuRoot.getBoundingClientRect().top;
      const parsedStickyTop = Number.parseFloat(getComputedStyle(menuRoot).top);
      const stickyTop = Number.isFinite(parsedStickyTop) ? parsedStickyTop : 0;
      // Measure from the sticky box (not the scrolled list inside it) and clamp to its sticky
      // offset so a box momentarily pushed under the header still shrinks to fit above the footer
      const menuTop = Math.max(rootTop, stickyTop);
      const viewportHeight = window.innerHeight;
      const menuContentHeight = menuContent.scrollHeight;

      // Constrain to the containing block above the footer once its margin enters view, otherwise to the viewport
      const footerGap = Math.max(MENU_BOTTOM_MARGIN, Number.isFinite(footerMarginTop) ? footerMarginTop : 0);
      const footerLimit = footerRect.top - footerGap;
      const viewportLimit = viewportHeight - MENU_BOTTOM_MARGIN;
      const maxHeight =
        footerRect.bottom > 0 && footerLimit < viewportLimit
          ? Math.max(0, footerLimit - menuTop)
          : Math.max(MENU_MIN_HEIGHT, viewportLimit - menuTop);

      const prevMaxHeight = lastMaxHeight;
      lastMaxHeight = maxHeight;
      const nextMaxHeight = `${maxHeight}px`;
      // The max-height belongs to this menu only
      if (menuRoot.style.getPropertyValue('--menu-max-height') !== nextMaxHeight) {
        menuRoot.style.setProperty('--menu-max-height', nextMaxHeight);
      }
      // Only contain overscroll when the menu actually overflows so short menus still chain wheel scrolling
      setIsScrollable(menuContentHeight > maxHeight);

      // Keep the selected option in view when the menu shrinks (e.g., as the footer enters view)
      const activeId = untrack(selectedId);
      if (maxHeight > 0 && prevMaxHeight !== undefined && maxHeight < prevMaxHeight && activeId !== '') {
        menuContent.querySelector(`#btn_${CSS.escape(activeId)}`)?.scrollIntoView({ block: 'nearest' });
      }
    };

    // Scroll, resize and layout changes update the height at most once per frame
    let frame: number | undefined;
    const scheduleUpdate = () => {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        updateMenuHeight();
      });
    };

    landscapeEl.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    // Observe layout shifts (cards loading, toolbar/filter wrapping, footer resizing, MOTD/overlay changes)
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    for (const target of getObservedLayoutElements(landscapeEl, menuRoot, footer)) {
      resizeObserver.observe(target);
    }
    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    // Re-check overflow when the menu entries change
    createEffect(on(visibleSections, scheduleUpdate, { defer: true }));

    // Run initial calculation
    updateMenuHeight();

    // Cleanup: remove listeners, disconnect observers, cancel the pending frame and reset the max-height
    onCleanup(() => {
      landscapeEl.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
        frame = undefined;
      }
      menuRoot.style.removeProperty('--menu-max-height');
    });
  });

  const updateRoute = (hash: string) => {
    navigate(`${location.pathname}${location.search}#${hash}`, {
      replace: true,
      scroll: false,
      state: { fromMenu: true },
    });
  };

  return (
    <Show when={visibleSections().length > 0}>
      <div
        ref={setRoot}
        class={`d-flex flex-column ${styles.toc}`}
        classList={{ [`sticky-top me-4 ${styles.sticky}`]: props.sticky }}
      >
        <div
          id="menu"
          ref={setContent}
          classList={{
            [styles.content]: props.sticky,
            [styles.containOverscroll]: props.sticky && isScrollable(),
          }}
        >
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
    </Show>
  );
};

export default Menu;

/**
 * Collects the layout elements whose size changes can move the sticky menu or
 * the footer, excluding the menu itself and its ancestors to avoid resize loops.
 */
const getObservedLayoutElements = (landscapeEl: HTMLElement, menuRoot: HTMLElement, footer: Element): Element[] => {
  const targets = new Set<Element>([landscapeEl, footer]);
  if (menuRoot.nextElementSibling) {
    targets.add(menuRoot.nextElementSibling);
  }
  const main = menuRoot.closest('main');
  if (main) {
    for (const child of Array.from(main.children)) {
      if (!child.contains(menuRoot)) {
        targets.add(child);
      }
    }
  }
  targets.delete(menuRoot);
  return [...targets];
};
