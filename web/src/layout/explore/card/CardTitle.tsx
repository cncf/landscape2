import isUndefined from 'lodash/isUndefined';
import { createSignal, onMount } from 'solid-js';

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
    if (!isUndefined(ref())) {
      if (ref()!.offsetWidth < ref()!.scrollWidth) {
        setFontSize('1rem');
      } else {
        setFontSize(DEFAULT_FONT_SIZE);
      }
    }
  };

  onMount(() => {
    updateTitleFont();
  });

  return (
    <div ref={setRef} class={`fw-semibold text-truncate pb-1 ${styles.title}`} style={{ 'font-size': fontSize() }}>
      {props.title}
    </div>
  );
};

export default CardTitle;
