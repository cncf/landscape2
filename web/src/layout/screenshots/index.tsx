import isUndefined from 'lodash/isUndefined';
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';

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
  const groups = () => props.initialData.groups || [{ name: 'default', categories: props.initialData.categories }];

  onMount(() => {
    // This class enables scroll in body to capture the full screenshot
    document.body.classList.add('screenshot');
    setGroupsData(prepareData(props.initialData, props.initialData.items));
  });

  onCleanup(() => {
    document.body.classList.remove('screenshot');
  });

  return (
    <>
      <main class="flex-grow-1 container-fluid px-3 px-lg-4 position-relative">
        <Show when={!isUndefined(groupsData())}>
          <For each={groups()}>
            {(group) => {
              const colorsList = () => generateColorsArray(group.categories.length);
              const groupData = groupsData()![group.name];

              return (
                <div class={styles.group}>
                  <Show when={!isUndefined(props.initialData.groups)}>
                    <div class={`fw-bold text-uppercase ${styles.title}`}>{group.name}</div>
                  </Show>
                  <For each={Object.keys(groupData)}>
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
