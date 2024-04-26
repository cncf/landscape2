import { createEffect, createSignal, on, Show } from 'solid-js';

import styles from './CollapsableText.module.css';

interface Props {
  text: string;
  maxLinesNumber?: number;
  class?: string;
}

const MAX_LINES = 4;
const LINE_HEIGHT = 19;

const CollapsableText = (props: Props) => {
  const [isLoaded, setIsLoaded] = createSignal<boolean>(false);
  const [enabledCollapsable, setEnabledCollapsable] = createSignal<boolean>(false);
  const [collapsable, setCollapsable] = createSignal<boolean>(true);
  const [textRef, setTextRef] = createSignal<HTMLDivElement>();
  const linesNumber = () => props.maxLinesNumber || MAX_LINES;

  createEffect(
    on(textRef, () => {
      if (textRef() && !isLoaded()) {
        setIsLoaded(true);
        if (textRef()!.offsetHeight > linesNumber() * LINE_HEIGHT) {
          setCollapsable(false);
          setEnabledCollapsable(true);
        }
      }
    })
  );

  return (
    <div class="position-relative">
      <div
        ref={setTextRef}
        class={`${styles.content} ${props.class}`}
        classList={{ [styles.truncate]: !collapsable() }}
        style={
          !collapsable()
            ? { '-webkit-line-clamp': linesNumber(), 'max-height': `${LINE_HEIGHT * linesNumber()}px` }
            : {}
        }
      >
        {props.text}
      </div>
      <Show when={enabledCollapsable() && !collapsable()}>
        <div class={`position-absolute end-0 ${styles.btnExpand}`}>
          <button
            class={`btn btn-sm btn-link fst-italic text-muted ${styles.btn}`}
            onClick={() => setCollapsable((prev) => !prev)}
          >
            Show more
          </button>
        </div>
      </Show>
    </div>
  );
};

export default CollapsableText;
