import isUndefined from 'lodash/isUndefined';
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';

import { ALL_OPTION } from '../../data';
import { BaseData, Group } from '../../types';
import generateColorsArray from '../../utils/generateColorsArray';
import getCategoriesWithItems from '../../utils/getCategoriesWithItems';
import { SubcategoryDetails } from '../../utils/gridCategoryLayout';
import itemsDataGetter, { GroupData } from '../../utils/itemsDataGetter';
import MiniFooter from '../navigation/MiniFooter';
import Grid from './Grid';
import styles from './Screenshots.module.css';

interface Props {
  initialData: BaseData;
}

const Screenshots = (props: Props) => {
  const [groupsData, setGroupsData] = createSignal<GroupData>();
  const groups = (): Group[] =>
    props.initialData.groups || [
      {
        categories: (props.initialData.categories ?? []).map((category) => category.name),
        name: ALL_OPTION,
        normalized_name: ALL_OPTION,
      },
    ];

  onMount(() => {
    // This class enables scroll in body to capture the full screenshot
    document.body.classList.add('screenshot');
    // Get grid data with all option when groups are not defined
    setGroupsData(itemsDataGetter.getGridData(props.initialData.groups ? false : true));
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
              const activeGroups = itemsDataGetter.getGroups();
              const normalizedName = group.normalized_name;
              if (isUndefined(normalizedName) || (activeGroups && !activeGroups.includes(normalizedName))) return null;
              const groupData = groupsData()![normalizedName];
              const categories = getCategoriesWithItems(groupData);
              const colors = generateColorsArray(categories.length);

              return (
                <div class={styles.group}>
                  <Show when={!isUndefined(activeGroups)}>
                    <div class={`fw-bold text-uppercase ${styles.title}`}>{group.name}</div>
                  </Show>
                  <For each={categories}>
                    {(cat, index) => {
                      const isOverridden =
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

                      return (
                        <Grid
                          categoryName={cat}
                          index={index()}
                          bgColor={colors[index()]}
                          isOverridden={isOverridden}
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
