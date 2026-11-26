import { createWindowSize } from '@solid-primitives/resize-observer';
import { createEffect, createSignal, on } from 'solid-js';

import styles from './Title.module.css';

/** Font size reduction of each fitting step, as a percentage. */
const FONT_SIZE_STEP = 5;

/** Font size the title starts from, as a percentage. */
const MAX_FONT_SIZE = 100;

/** Smallest font size the title shrinks to, as a percentage. */
const MIN_FONT_SIZE = 40;

interface Props {
  content: string;
}

/** Question title whose font shrinks until the text fits its container, down to `MIN_FONT_SIZE`. */
const Title = (props: Props) => {
  const text = () => props.content;
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [textRef, setTextRef] = createSignal<HTMLDivElement>();
  const [fontSize, setFontSize] = createSignal<number>(MAX_FONT_SIZE);
  const size = createWindowSize();
  const width = () => size.width;

  const checkSize = () => {
    if (textRef() && ref() && fontSize() > MIN_FONT_SIZE && textRef()!.offsetHeight > ref()!.offsetHeight) {
      setFontSize(Math.max(MIN_FONT_SIZE, fontSize() - FONT_SIZE_STEP));
    }
  };

  // Each new font size is checked once rendered, so the text shrinks step by step until it fits
  createEffect(on(fontSize, checkSize));

  // A new text or window width may fit at a bigger size, so the fit starts again from the full size
  createEffect(
    on(
      [text, width],
      () => {
        if (fontSize() === MAX_FONT_SIZE) {
          checkSize();
        } else {
          setFontSize(MAX_FONT_SIZE);
        }
      },
      { defer: true }
    )
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
