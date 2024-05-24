import { createWindowSize } from '@solid-primitives/resize-observer';
import { createEffect, createSignal, on } from 'solid-js';

import styles from './Title.module.css';

interface Props {
  content: string;
}

const Title = (props: Props) => {
  const text = () => props.content;
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [textRef, setTextRef] = createSignal<HTMLDivElement>();
  const [fontSize, setFontSize] = createSignal<number>(100);
  const size = createWindowSize();
  const width = () => size.width;

  const checkSize = () => {
    if (textRef() && ref()) {
      if (textRef()!.offsetHeight > ref()!.offsetHeight) {
        setFontSize(fontSize() - 5);
      }
    }
  };

  createEffect(
    on(fontSize, () => {
      checkSize();
    })
  );

  createEffect(
    on(width, () => {
      checkSize();
    })
  );

  createEffect(
    on(text, () => {
      setFontSize(100);
      checkSize();
    })
  );

  return (
    <div ref={setRef} class={`position-relative w-100 h-100 ${styles.container}`}>
      <div
        ref={setTextRef}
        class={`position-absolute w-100 text-center ${styles.text}`}
        style={{ 'font-size': `${fontSize()}%` }}
      >
        {text()}
      </div>
    </div>
  );
};

export default Title;
