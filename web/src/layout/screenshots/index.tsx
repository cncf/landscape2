import { isUndefined } from 'lodash';
import { createSignal, For, onMount, Show } from 'solid-js';

import { BaseData } from '../../types';
import generateColorsArray from '../../utils/generateColorsArray';
import { SubcategoryDetails } from '../../utils/gridCategoryLayout';
import prepareData, { GroupData } from '../../utils/prepareData';
import MiniFooter from '../navigation/MiniFooter';
import Grid from './Grid';
import styles from './Screenshots.module.css';

interface Props {
  initialData: BaseData;
}

const Screenshots = (props: Props) => {
  const [groupsData, setGroupsData] = createSignal<GroupData>();

  onMount(() => {
    setGroupsData(prepareData(props.initialData, props.initialData.items));
  });

  return (
    <>
      <main class="flex-grow-1 container-fluid d-none d-lg-block px-4 position-relative">
        <Show when={!isUndefined(groupsData())}>
          <For each={props.initialData.groups}>
            {(group) => {
              const colorsList = () => generateColorsArray(group.categories.length);
              const groupData = groupsData()![group.name];

              return (
                <div class={styles.group}>
                  <div class={`fw-bold text-uppercase ${styles.title}`}>{group.name}</div>
                  <For each={group.categories}>
                    {(cat, index) => {
                      const isOverriden =
                        !isUndefined(props.initialData.categories_overridden) &&
                        props.initialData.categories_overridden.includes(cat);
                      const subcategories: SubcategoryDetails[] = [];
                      Object.keys(groupData![cat]).forEach((subcat: string) => {
                        if (groupData![cat][subcat].items.length !== 0) {
                          subcategories.push({
                            name: subcat,
                            itemsCount: groupData![cat][subcat].itemsCount,
                            itemsFeaturedCount: groupData![cat][subcat].itemsFeaturedCount,
                          });
                        }
                      });
                      const catData = groupData[cat];
                      const bgColor = () => colorsList()[index()];

                      return (
                        <Grid
                          categoryName={cat}
                          index={index()}
                          bgColor={bgColor()}
                          isOverriden={isOverriden}
                          subcategories={subcategories}
                          categoryData={catData}
                        />
                      );
                    }}
                  </For>
                </div>
              );
            }}
          </For>
        </Show>
      </main>
      <MiniFooter />
    </>
  );
};

export default Screenshots;
