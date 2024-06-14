import { createScrollPosition } from '@solid-primitives/scroll';
import { SVGIcon, SVGIconKind, useBreakpointDetect } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on } from 'solid-js';

import { SMALL_DEVICES_BREAKPOINTS } from '../../data';
import scrollToTop from '../../utils/scrollToTop';
import styles from './ButtonToTopScroll.module.css';

const NAV_HEIGHT = 200;

const ButtonToTopScroll = () => {
  const { point } = useBreakpointDetect();
  const onSmallDevice = !isUndefined(point()) && SMALL_DEVICES_BREAKPOINTS.includes(point()!);
  const [isVisible, setIsVisible] = createSignal<boolean>(false);
  const target = onSmallDevice ? window : document.getElementById('landscape');
  const scroll = createScrollPosition(target as Element);
  const y = () => scroll.y;

  createEffect(
    on(y, () => {
      setIsVisible(y() > NAV_HEIGHT);
    })
  );

  return (
    <div
      class={`d-flex justify-content-end sticky-bottom ${styles.sticky}`}
      classList={{ 'd-none': !isVisible(), [styles.smallDevice]: onSmallDevice }}
    >
      <div class={`position-relative ${styles.btnTopWrapper}`}>
        <button
          class={`btn btn-secondary btn-sm lh-1 text-white rounded-circle ${styles.btnTop}`}
          onClick={(e: MouseEvent) => {
            e.preventDefault();
            scrollToTop(onSmallDevice);
          }}
        >
          <SVGIcon kind={SVGIconKind.ArrowTop} class={`position-relative ${styles.btnTopIcon}`} />
        </button>
      </div>
    </div>
  );
};

export default ButtonToTopScroll;
