import isUndefined from 'lodash/isUndefined';
import trim from 'lodash/trim';
import { createSignal, For, onMount, Show } from 'solid-js';

import { FOUNDATION } from '../../data';
import { BaseItem, Item } from '../../types';
import sortItemsByOrderValue from '../../utils/sortItemsByOrderValue';
import styles from './SubcategoryExtended.module.css';
import SubcategoryGrid from './SubcategoryGrid';

interface Props {
  keywords?: string[];
  category: string;
  subcategory: string;
}

const SubcategoryExtended = (props: Props) => {
  const foundation = FOUNDATION;
  const [items, setItems] = createSignal<(BaseItem | Item)[]>();
  const [itemsInTable, setItemsInTable] = createSignal<(BaseItem | Item)[]>();

  onMount(() => {
    const itemsInSubcategory = window.baseDS.items.filter(
      (i: Item) => props.subcategory === i.subcategory && props.category === i.category
    );

    if (!isUndefined(itemsInSubcategory) && itemsInSubcategory.length > 0) {
      const sortedItems = sortItemsByOrderValue(itemsInSubcategory);
      setItems(sortedItems);
      const filteredItems = sortedItems.filter((i: BaseItem | Item) => !isUndefined(i.maturity));
      if (filteredItems.length > 0) {
        setItemsInTable(filteredItems);
      }
    }
  });

  return (
    <>
      <Show when={!isUndefined(itemsInTable()) || !isUndefined(props.keywords)}>
        <table class="table table-bordered mt-3 mb-4 my-lg-5">
          <thead>
            <tr>
              <th class={`w-50 ${styles.header}`} scope="col">
                {foundation} Projects
              </th>
              <th class={`w-50 ${styles.header}`} scope="col">
                Keywords
              </th>
            </tr>
          </thead>
          <tbody class={styles.content}>
            <tr>
              <td class="py-4">
                <Show when={!isUndefined(itemsInTable()) && itemsInTable()!.length > 0} fallback={'-'}>
                  <ul class="mb-0 text-muted">
                    <For each={itemsInTable()}>
                      {(item: Item) => {
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

              <td class="py-4">
                <Show when={!isUndefined(props.keywords)} fallback={<>-</>}>
                  <ul class="mb-0 text-muted">
                    <For each={props.keywords}>{(buzzword: string) => <li>{trim(buzzword)}</li>}</For>
                  </ul>
                </Show>
              </td>
            </tr>
          </tbody>
        </table>
      </Show>
      <Show when={!isUndefined(items())}>
        <SubcategoryGrid items={items()} />
      </Show>
    </>
  );
};

export default SubcategoryExtended;
