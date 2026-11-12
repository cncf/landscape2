import { createScrollPosition } from '@solid-primitives/scroll';
import { SMALL_DEVICES_BREAKPOINTS, SVGIcon, SVGIconKind, useBreakpointDetect } from 'common';
import { createMemo, Show } from 'solid-js';

import scrollToTop from '../../utils/scrollToTop';
import styles from './ButtonToTopScroll.module.css';

const NAV_HEIGHT = 200;

const ButtonToTopScroll = () => {
  const { point } = useBreakpointDetect();
  const onSmallDevice = createMemo(() => SMALL_DEVICES_BREAKPOINTS.includes(point()));
  // Small devices scroll the window and the others the landscape container. A new
  // target per breakpoint change makes the keyed Show recreate the scroll position.
  const scrollTarget = createMemo(() => ({
    element: onSmallDevice() ? window : (document.getElementById('landscape') ?? window),
    onWindow: onSmallDevice(),
  }));

  return (
    <Show when={scrollTarget()} keyed>
      {(target) => {
        const scroll = createScrollPosition(target.element);
        const isVisible = () => scroll.y > NAV_HEIGHT;

        return (
          <div
            class={`d-flex justify-content-end sticky-bottom ${styles.sticky}`}
            classList={{ 'd-none': !isVisible(), [styles.smallDevice]: target.onWindow }}
          >
            <div class={`position-relative ${styles.btnTopWrapper}`}>
              <button
                class={`btn btn-secondary btn-sm lh-1 text-white rounded-circle ${styles.btnTop}`}
                onClick={(e: MouseEvent) => {
                  e.preventDefault();
                  scrollToTop(target.onWindow);
                }}
                aria-label="Scroll to top"
              >
                <SVGIcon kind={SVGIconKind.ArrowTop} class={`position-relative ${styles.btnTopIcon}`} />
              </button>
            </div>
          </div>
        );
      }}
    </Show>
  );
};

export default ButtonToTopScroll;
