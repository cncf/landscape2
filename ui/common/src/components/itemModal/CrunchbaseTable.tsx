import { createMemo, createSignal, For, JSXElement, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { cx } from '../../utils/cx';

/** Column of a Crunchbase table; `class` applies to both its header and its cells. */
export interface CrunchbaseTableColumn<T> {
  cell: (row: T) => JSXElement;
  // Rendered per table, so a column set can be shared by several tables
  header: () => JSXElement;
  class?: string;
}

interface Props<T extends object> {
  columns: CrunchbaseTableColumn<T>[];
  rows: T[];
  title: string;
  titleClass?: string;
}

// Rows visible while the table is collapsed
const MAX_ITEMS = 10;

const Table = css`
  table-layout: fixed;

  thead {
    font-size: 0.8rem;
  }

  th {
    color: var(--bs-gray-600);
  }

  td {
    font-size: 0.8rem;
    line-height: 2;
  }

  @media only screen and (max-width: 767.98px) {
    thead {
      font-size: 0.6rem;
    }

    td {
      font-size: 0.7rem;
      line-height: 1.5;
    }
  }
`;

const CollapsedBtn = css`
  font-size: 0.8rem;
`;

/**
 * Table of Crunchbase entries (funding rounds, acquisitions). Rows without any value are skipped, and
 * only the first rows show until the table is expanded.
 */
export const CrunchbaseTable = <T extends object>(props: Props<T>) => {
  const [collapsed, setCollapsed] = createSignal(true);
  const rows = createMemo(() => props.rows.filter((r) => Object.values(r).some((v) => v !== undefined)));
  const visibleRows = () => (collapsed() ? rows().slice(0, MAX_ITEMS) : rows());
  const toggleLabel = () => `Show ${collapsed() ? 'more' : 'less'}`;

  return (
    <Show when={rows().length > 0}>
      <div class={cx('fw-bold text-uppercase mt-3 mt-lg-4 mb-2 mb-lg-3', props.titleClass)}>{props.title}</div>
      <div class="w-100 my-3">
        <table class={`table table-sm table-striped table-bordered mb-0 ${Table}`}>
          <thead class="text-uppercase text-muted">
            <tr>
              <For each={props.columns}>
                {(column) => (
                  <th class={cx('text-center', column.class)} scope="col">
                    {column.header()}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={visibleRows()}>
              {(row) => (
                <tr>
                  <For each={props.columns}>
                    {(column) => <td class={cx('px-2 px-lg-3', column.class)}>{column.cell(row)}</td>}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <Show when={rows().length > MAX_ITEMS}>
          <div class="w-100 text-center">
            <button
              type="button"
              class={`btn btn-link btn-sm text-muted text-decoration-underline pe-0 ${CollapsedBtn}`}
              onClick={() => setCollapsed(!collapsed())}
              aria-expanded={!collapsed()}
              aria-label={`${toggleLabel()} ${props.title.toLowerCase()}`}
            >
              {toggleLabel()}
            </button>
          </div>
        </Show>
      </div>
    </Show>
  );
};
