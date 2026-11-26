import { createMemo, For, Show } from 'solid-js';

import { cx } from '../utils/cx';
import { formatPercentage } from '../utils/formatPercentage';
import { sortObjectByValue } from '../utils/sortObjectByValue';
import { Box } from './Box';

interface Props {
  initialLanguages: { [key: string]: number };
  boxClass?: string;
  class?: string;
}

// Maximum number of languages shown, the most used first
const MAX_LANGUAGES = 5;

/** Share of each of the most used languages of a repository; nothing renders when no bytes are reported. */
export const LanguagesStats = (props: Props) => {
  const total = createMemo(() => Object.values(props.initialLanguages).reduce((a, b) => a + b, 0));
  const popular = createMemo(() => sortObjectByValue(props.initialLanguages).slice(0, MAX_LANGUAGES));
  const percentage = (lang: string) => (100 * props.initialLanguages[lang]) / total();

  return (
    <Show when={total() > 0}>
      <div class={cx('row g-4 my-0 mb-2 justify-content-center justify-content-md-start', props.class)}>
        <For each={popular()}>
          {(lang) => (
            <Box
              class={props.boxClass}
              value={formatPercentage(percentage(lang))}
              legend={lang}
              fillBgPercentage={percentage(lang)}
              description={`${lang} language percentage`}
            />
          )}
        </For>
      </div>
    </Show>
  );
};
