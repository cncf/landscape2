import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, For, on, Show } from 'solid-js';

import detectIfSafari from '../../../utils/detectIfSafari';
import generateColorsArray from '../../../utils/generateColorsArray';
import getCategoriesWithItems from '../../../utils/getCategoriesWithItems';
import { SubcategoryDetails } from '../../../utils/gridCategoryLayout';
import { CategoriesData, CategoryData } from '../../../utils/itemsDataGetter';
import Grid from './Grid';
import styles from './GridCategory.module.css';

interface Props {
  data: CategoriesData;
  categories_overridden?: string[];
  initialIsVisible: boolean;
}

interface CatProps {
  index: number;
  catSectionNumber: number;
  bgColor: string;
  categoryName: string;
  isOverriden: boolean;
  content: CategoryData;
  isSafari: boolean;
}

const Category = (props: CatProps) => {
  const [subcategories, setSubcategories] = createSignal<SubcategoryDetails[]>();

  createEffect(
    () => {
      console.log('isSafari ---->>>> ', props.isSafari);
      if (!isUndefined(props.content)) {
        const subcategoriesTmp: SubcategoryDetails[] = [];
        Object.keys(props.content).forEach((subcat: string) => {
          if (props.content[subcat].items.length !== 0) {
            subcategoriesTmp.push({
              name: subcat,
              itemsCount: props.content[subcat].itemsCount,
              itemsFeaturedCount: props.content[subcat].itemsFeaturedCount,
            });
          }
        });

        setSubcategories(subcategoriesTmp);
      }
    },
    { refer: true }
  );

  return (
    <Show when={!isUndefined(subcategories()) && subcategories()!.length > 0}>
      <div class="d-flex flex-row">
        <div
          class={`text-white border border-3 border-white fw-medium border-start-0 d-flex flex-row align-items-center justify-content-end position-relative ${styles.catTitleTextWrapper}`}
          classList={{
            'border-top-0': props.index !== 0,
            'border-bottom-0': props.index === props.catSectionNumber,
          }}
          style={{ 'background-color': props.bgColor }}
        >
          <Show
            when={!props.isSafari}
            fallback={
              <div class={`position-absolute text-end ${styles.catTitle} ${styles.ellipsis}`}>
                <div class={`${styles.safariTitle}`}>{props.categoryName}</div>
              </div>
            }
          >
            <div class={`position-absolute text-end d-flex justify-content-end align-items-center ${styles.catTitle}`}>
              <div class={`${styles.ellipsis}`}>{props.categoryName}</div>
            </div>
          </Show>
        </div>

        <div class="d-flex flex-column w-100 align-items-stretch">
          <Grid
            categoryName={props.categoryName}
            isOverriden={props.isOverriden}
            subcategories={subcategories()!}
            initialCategoryData={props.content}
            backgroundColor={props.bgColor}
            categoryIndex={props.index}
          />
        </div>
      </div>
    </Show>
  );
};

const GridCategory = (props: Props) => {
  const [colorsList, setColorsList] = createSignal<string[]>([]);
  const [firstLoad, setFirstLoad] = createSignal<boolean>(false);
  const [isVisible, setIsVisible] = createSignal<boolean>(false);
  const [catWithItems, setCatWithItems] = createSignal<string[]>([]);
  const data = () => props.data;
  const isSafari = () => detectIfSafari();

  createEffect(() => {
    if (props.initialIsVisible !== isVisible()) {
      setIsVisible(props.initialIsVisible);
      if (props.initialIsVisible && !firstLoad()) {
        setFirstLoad(true);
      }
    }
  });

  createEffect(
    on(data, () => {
      if (!isUndefined(data())) {
        setColorsList(generateColorsArray(Object.keys(data()).length));
        setCatWithItems(getCategoriesWithItems(data()));
      }
    })
  );

  return (
    <Show when={firstLoad()}>
      <For each={catWithItems()}>
        {(cat, index) => {
          const isOverriden = !isUndefined(props.categories_overridden) && props.categories_overridden.includes(cat);

          return (
            <Category
              index={index()}
              isOverriden={isOverriden}
              categoryName={cat}
              bgColor={[...colorsList()][index()]}
              catSectionNumber={Object.keys(data()).length - 1}
              content={data()[cat]}
              isSafari={isSafari()}
            />
          );
        }}
      </For>
    </Show>
  );
};

export default GridCategory;
