import isUndefined from 'lodash/isUndefined';
import trim from 'lodash/trim';
import { createMemo, For, Show } from 'solid-js';

import { FOUNDATION } from '../../data';
import { LandscapeItem } from '../../types';
import itemsDataGetter from '../../utils/itemsDataGetter';
import sortItemsByOrderValue from '../../utils/sortItemsByOrderValue';
import styles from './SubcategoryExtended.module.css';
import SubcategoryGrid from './SubcategoryGrid';

interface Props {
  keywords?: string[];
  category: string;
  subcategory: string;
}

const SubcategoryExtended = (props: Props) => {
  const items = createMemo<LandscapeItem[]>(() =>
    sortItemsByOrderValue(itemsDataGetter.getItemsBySubcategory(props.category, props.subcategory))
  );
  const itemsInTable = createMemo(() => items().filter((i: LandscapeItem) => !isUndefined(i.maturity)));

  return (
    <>
      <Show when={itemsInTable().length > 0 || !isUndefined(props.keywords)}>
        <table class="table table-bordered mt-3 mb-4 my-lg-5">
          <thead>
            <tr>
              <th class={`w-50 ${styles.header}`} scope="col">
                {FOUNDATION} Projects
              </th>
              <th class={`d-none d-sm-table-cell w-50 ${styles.header}`} scope="col">
                Keywords
              </th>
            </tr>
          </thead>
          <tbody class={styles.content}>
            <tr>
              <td class="py-4">
                <Show when={itemsInTable().length > 0} fallback={'-'}>
                  <ul class="mb-0 text-muted">
                    <For each={itemsInTable()}>
                      {(item: LandscapeItem) => {
                        return (
                          <li>
                            {item.name} ({item.maturity})
                          </li>
                        );
                      }}
                    </For>
                  </ul>
                </Show>
              </td>

              <td class="py-4 d-none d-sm-table-cell">
                <Show when={!isUndefined(props.keywords)} fallback={<>-</>}>
                  <ul class="mb-0 text-muted">
                    <For each={props.keywords}>{(buzzword: string) => <li>{trim(buzzword)}</li>}</For>
                  </ul>
                </Show>
              </td>
            </tr>
          </tbody>
        </table>

        <Show when={!isUndefined(props.keywords)}>
          <div class="d-block d-sm-none">
            <table class="table table-bordered mt-3 mb-4 my-lg-5">
              <thead>
                <tr>
                  <th class={`w-50 ${styles.header}`} scope="col">
                    Keywords
                  </th>
                </tr>
              </thead>
              <tbody class={styles.content}>
                <tr>
                  <td class="py-4">
                    <ul class="mb-0 text-muted">
                      <For each={props.keywords}>{(buzzword: string) => <li>{trim(buzzword)}</li>}</For>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Show>
      </Show>
      <Show when={items().length > 0}>
        <SubcategoryGrid items={items()} />
      </Show>
    </>
  );
};

export default SubcategoryExtended;
