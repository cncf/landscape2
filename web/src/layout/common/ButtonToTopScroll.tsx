import { createScrollPosition } from '@solid-primitives/scroll';
import { createEffect, createSignal, on } from 'solid-js';

import { SVGIconKind } from '../../types';
import scrollToTop from '../../utils/scrollToTop';
import styles from './ButtonToTopScroll.module.css';
import SVGIcon from './SVGIcon';

const NAV_HEIGHT = 200;

const ButtonToTopScroll = () => {
  const [isVisible, setIsVisible] = createSignal<boolean>(false);
  const target = document.getElementById('landscape');
  const scroll = createScrollPosition(target as Element);
  const y = () => scroll.y;

  createEffect(
    on(y, () => {
      setIsVisible(y() > NAV_HEIGHT);
    })
  );

  return (
    <div class={`d-flex justify-content-end sticky-bottom ${styles.sticky}`} classList={{ 'd-none': !isVisible() }}>
      <div class={`position-relative ${styles.btnTopWrapper}`}>
        <button
          class={`btn btn-secondary btn-sm lh-1 text-white rounded-circle ${styles.btnTop}`}
          onClick={(e: MouseEvent) => {
            e.preventDefault();
            scrollToTop(false);
          }}
        >
          <SVGIcon kind={SVGIconKind.ArrowTop} />
        </button>
      </div>
    </div>
  );
};

export default ButtonToTopScroll;
