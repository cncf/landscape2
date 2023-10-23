import { createScrollPosition } from '@solid-primitives/scroll';
import { useNavigate } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, Show } from 'solid-js';

import { SVGIconKind } from '../../types';
import isElementInView from '../../utils/isElementInView';
import styles from './ButtonToTopScroll.module.css';
import SVGIcon from './SVGIcon';

interface Props {
  firstSection: string | null;
}

const NAV_HEIGHT = 200;

const ButtonToTopScroll = (props: Props) => {
  const navigate = useNavigate();
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
    <Show when={!isUndefined(props.firstSection)}>
      <div class={`d-flex justify-content-end sticky-bottom ${styles.sticky}`} classList={{ 'd-none': !isVisible() }}>
        <div class={`position-relative ${styles.btnTopWrapper}`}>
          <button
            class={`btn btn-secondary btn-sm lh-1 text-white rounded-circle ${styles.btnTop}`}
            onClick={(e: MouseEvent) => {
              e.preventDefault();

              if (props.firstSection) {
                navigate(`${location.pathname}${location.search}#${props.firstSection}`, {
                  replace: true,
                });

                document.getElementById('landscape')!.scrollTo({
                  top: 0,
                  left: 0,
                  behavior: 'instant',
                });

                if (!isElementInView(`btn_${props.firstSection}`)) {
                  const target = window.document.getElementById(`btn_${props.firstSection}`);
                  if (target) {
                    target.scrollBy({ top: 0, behavior: 'instant' });
                  }

                  const menu = window.document.getElementById('menu');
                  if (menu) {
                    menu.scroll({
                      top: 0,
                      left: 0,
                      behavior: 'instant',
                    });
                  }
                }
              }
            }}
          >
            <SVGIcon kind={SVGIconKind.ArrowTop} />
          </button>
        </div>
      </div>
    </Show>
  );
};

export default ButtonToTopScroll;
