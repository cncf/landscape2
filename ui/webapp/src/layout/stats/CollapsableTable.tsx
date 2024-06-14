import { SVGIcon, SVGIconKind } from 'common';
import orderBy from 'lodash/orderBy';
import { createSignal, For, onMount, Show } from 'solid-js';

import { CategoryValueStats } from '../../types';
import sumValues from '../../utils/sumValues';
import styles from './CollapsableTable.module.css';

interface Props {
  data: {
    [key: string]: CategoryValueStats;
  };
}

const CollapsableTable = (props: Props) => {
  const [expanded, setExpanded] = createSignal<string>();
  const [sortedCategories, setSortedCategories] = createSignal<string[]>([]);

  onMount(() => {
    const sorted = orderBy(Object.keys(props.data), [(cat: string) => cat.toLowerCase().toString()], 'asc');
    setSortedCategories(sorted);
    setExpanded(sorted[0]);
  });

  return (
    <div>
      <table class={`table table-bordered mb-0 mb-lg-2 ${styles.table}`}>
        <thead>
          <tr>
            <th class={`border-end-0 ${styles.caretCol}`} />
            <th class="text-center border-start-0" scope="col">
              Category / Subcategory
            </th>
            <th class={`text-center ${styles.projectsCol}`} scope="col">
              Projects
            </th>
          </tr>
        </thead>
        <tbody>
          <For each={sortedCategories()}>
            {(cat: string) => {
              const subcategories = props.data[cat].subcategories;
              const isExpanded = () => expanded() === cat;

              return (
                <>
                  <tr
                    onClick={() => {
                      if (isExpanded()) {
                        setExpanded();
                      } else {
                        setExpanded(cat);
                      }
                    }}
                    class={`${styles.grayCell} ${styles.clickable}`}
                  >
                    <td class="border-end-0">
                      <Show when={isExpanded()} fallback={<SVGIcon kind={SVGIconKind.CaretDown} />}>
                        <SVGIcon kind={SVGIconKind.CaretUp} />
                      </Show>
                    </td>
                    <td class="border-start-0">{cat}</td>
                    <td class="text-end">{props.data[cat].projects}</td>
                  </tr>
                  <Show when={isExpanded()}>
                    <For each={Object.keys(subcategories).sort()}>
                      {(subcat: string) => (
                        <tr>
                          <td class="border-end-0" />
                          <td class="border-start-0">{subcat}</td>
                          <td class="text-end">{subcategories[subcat]}</td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </>
              );
            }}
          </For>
          <tr class={styles.grayCell}>
            <td colspan={2} class="fw-semibold text-uppercase">
              Total
            </td>
            <td class="text-end fw-semibold">
              {sumValues(Object.values(Object.values(props.data).map((i: CategoryValueStats) => i.projects)))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default CollapsableTable;
