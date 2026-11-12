import { SVGIcon, SVGIconKind } from 'common';
import orderBy from 'lodash/orderBy';
import { createSignal, createUniqueId, For, onMount, Show } from 'solid-js';

import { CategoryProjectsStats } from '../../types';
import sumValues from '../../utils/sumValues';
import styles from './CollapsableTable.module.css';

interface Props {
  data: {
    [key: string]: CategoryProjectsStats;
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
        <For each={sortedCategories()}>
          {(cat: string) => {
            const subcategories = props.data[cat].subcategories ?? {};
            const isExpanded = () => expanded() === cat;
            const rowsId = createUniqueId();

            return (
              <>
                <tbody>
                  <tr class={styles.grayCell}>
                    <td class="border-end-0">
                      <Show when={isExpanded()} fallback={<SVGIcon kind={SVGIconKind.CaretDown} />}>
                        <SVGIcon kind={SVGIconKind.CaretUp} />
                      </Show>
                    </td>
                    <td class="border-start-0 p-0">
                      <button
                        type="button"
                        class={`btn btn-link border-0 rounded-0 w-100 text-start text-reset ${styles.expandBtn}`}
                        onClick={() => setExpanded(isExpanded() ? undefined : cat)}
                        aria-expanded={isExpanded()}
                        aria-controls={rowsId}
                      >
                        {cat}
                      </button>
                    </td>
                    <td class="text-end">{props.data[cat].projects}</td>
                  </tr>
                </tbody>
                <tbody id={rowsId} hidden={!isExpanded()}>
                  <For each={Object.keys(subcategories).sort()}>
                    {(subcat: string) => (
                      <tr>
                        <td class="border-end-0" />
                        <td class="border-start-0">{subcat}</td>
                        <td class="text-end">{subcategories[subcat]}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </>
            );
          }}
        </For>
        <tbody>
          <tr class={styles.grayCell}>
            <td colspan={2} class="fw-semibold text-uppercase">
              Total
            </td>
            <td class="text-end fw-semibold">
              {sumValues(Object.values(props.data).map((i: CategoryProjectsStats) => i.projects))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default CollapsableTable;
