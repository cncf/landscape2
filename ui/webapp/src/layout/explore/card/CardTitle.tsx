import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on } from 'solid-js';

import styles from './CardTitle.module.css';

interface Props {
  title: string;
  isVisible?: boolean;
}

const DEFAULT_FONT_SIZE = '1.15rem';

const CardTitle = (props: Props) => {
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [fontSize, setFontSize] = createSignal<string>(DEFAULT_FONT_SIZE);

  const updateTitleFont = () => {
    const titleEl = ref();
    if (!isUndefined(titleEl)) {
      setFontSize(titleEl.offsetWidth < titleEl.scrollWidth ? '1rem' : DEFAULT_FONT_SIZE);
    }
  };

  // A title mounted while hidden has no width, so it is measured again once it becomes visible
  createEffect(
    on(
      () => props.isVisible ?? true,
      (isVisible) => {
        if (isVisible) {
          updateTitleFont();
        }
      }
    )
  );

  return (
    <div ref={setRef} class={`fw-semibold text-truncate pb-1 ${styles.title}`} style={{ 'font-size': fontSize() }}>
      {props.title}
    </div>
  );
};

export default CardTitle;
