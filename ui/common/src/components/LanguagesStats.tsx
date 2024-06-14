import { createEffect, createSignal, For, on } from 'solid-js';

import { sortObjectByValue } from '../utils/sortObjectByValue';
import { Box } from './Box';

interface Props {
  initialLanguages: { [key: string]: number };
  boxClass?: string;
  class?: string;
}

export const LanguagesStats = (props: Props) => {
  const languages = () => props.initialLanguages;
  const [total, setTotal] = createSignal<number>(0);
  const [popularLanguages, setPopularLanguages] = createSignal<string[]>([]);

  const percentage = (partialValue: number) => {
    return (100 * partialValue) / total();
  };

  createEffect(
    on(languages, () => {
      const totalBytes = Object.values(languages()).reduce((a, b) => a + b, 0);
      setTotal(totalBytes);
      const sortedLanguages = sortObjectByValue(languages());
      setPopularLanguages(sortedLanguages.length > 5 ? sortedLanguages.slice(0, 3) : sortedLanguages);
    })
  );

  return (
    <div class={`row g-4 my-0 mb-2 justify-content-center justify-md-content-start ${props.class}`}>
      <For each={popularLanguages()}>
        {(lang: string) => {
          const value = () => percentage(languages()[lang]);

          return (
            <Box
              class={props.boxClass}
              value={`${Number.isInteger(value()) ? value() : value().toFixed(2)}%`}
              legend={lang}
              fillBgPercentage={value()}
            />
          );
        }}
      </For>
    </div>
  );
};
