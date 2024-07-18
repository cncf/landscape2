import { A } from '@solidjs/router';
import { SVGIcon, SVGIconKind } from 'common';
import intersection from 'lodash/intersection';
import isUndefined from 'lodash/isUndefined';
import { Accessor, For, Match, Show, Switch } from 'solid-js';

import { COLORS, GUIDE_PATH } from '../../../data';
import { BaseItem, Category, ClassifyOption, Item, SortDirection, SortOption, Subcategory } from '../../../types';
import getNormalizedName from '../../../utils/getNormalizedName';
import isSectionInGuide from '../../../utils/isSectionInGuide';
import sortItems from '../../../utils/sortItems';
import sortMaturityStatusTitles from '../../../utils/sortMenuOptions';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import Card from './Card';
import styles from './Content.module.css';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Accessor<any>;
  classify: ClassifyOption;
  sorted: SortOption;
  direction: SortDirection;
  isVisible: boolean;
}

interface ListProps {
  items: BaseItem[];
  sorted: SortOption;
  direction: SortDirection;
  isVisible: boolean;
}

const CardList = (props: ListProps) => {
  const updateActiveItemId = useUpdateActiveItemId();
  const itemsList = () => props.items;
  const items = () => sortItems(itemsList(), props.sorted, props.direction);

  return (
    <div class="row g-4 mb-4">
      <For each={items()}>
        {(item: Item) => {
          return (
            <div class="col-12 col-lg-6 col-xxl-4 col-xxxl-3">
              <div
                class={`card rounded-0 p-3 ${styles.card}`}
                onClick={() => updateActiveItemId(item.id)}
                classList={{
                  [styles.archived]: !isUndefined(item.maturity) && item.maturity === 'archived',
                }}
              >
                <Card
                  item={item}
                  logoClass={styles.logo}
                  class={`h-100 ${styles.cardContent}`}
                  isVisible={props.isVisible}
                />
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
};

const Content = (props: Props) => {
  const bgColor = COLORS[0];
  const data = () => props.data();

  const getSubtitles = (content: { [key: string]: unknown }, title: string): string[] => {
    let subtitles = Object.keys(content).sort();
    if (
      props.classify === ClassifyOption.Category &&
      window.baseDS.categories_overridden &&
      window.baseDS.categories_overridden.includes(title)
    ) {
      const currentCategory = window.baseDS.categories.find((c: Category) => c.name === title);
      if (currentCategory) {
        const subcategories: string[] = currentCategory.subcategories.map((s: Subcategory) => s.name);
        subtitles = intersection(subcategories, subtitles);
      }
    }

    return subtitles;
  };

  const countItems = (content: { [key: string]: unknown }): number => {
    let numItems: number = 0;
    Object.keys(content).forEach((subtitle: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      numItems += (content as any)[subtitle].length;
    });
    return numItems;
  };

  return (
    <Show when={!isUndefined(data())}>
      <Switch>
        <Match when={Array.isArray(data())}>
          <CardList items={data()} isVisible={props.isVisible} sorted={props.sorted} direction={props.direction} />
        </Match>
        <Match when={!Array.isArray(data())}>
          <For each={sortMaturityStatusTitles(Object.keys(data()))}>
            {(title: string) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const content = () => (data() as any)[title] as { [key: string]: unknown } | (BaseItem | Item)[];
              const numItems = () => countItems(content() as { [key: string]: unknown });

              return (
                <div>
                  <Switch>
                    <Match when={!Array.isArray(content())}>
                      <For each={getSubtitles(content() as { [key: string]: unknown }, title)}>
                        {(subtitle: string) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const items = () => (content() as any)[subtitle];
                          if (items().length === 0) return null;

                          const id = getNormalizedName({ title: title, subtitle: subtitle, grouped: true });

                          return (
                            <div id={`card_${id}`} class={`mb-3 ${styles.section}`}>
                              <div class={`d-flex flex-row fw-semibold mb-4 ${styles.title}`}>
                                <div
                                  class={`d-flex flex-row align-items-center p-2 ${styles.categoryTitle}`}
                                  style={{ 'background-color': bgColor }}
                                >
                                  <Show when={isSectionInGuide(title)}>
                                    <div>
                                      <A
                                        href={`${GUIDE_PATH}#${getNormalizedName({ title: title })}`}
                                        state={{ from: 'explore' }}
                                        class={`position-relative btn btn-link text-white p-0 pe-2 ${styles.btnIcon}`}
                                      >
                                        <SVGIcon kind={SVGIconKind.Guide} />
                                      </A>
                                    </div>
                                  </Show>
                                  <div class="text-white text-nowrap text-truncate">
                                    {title} ({numItems()})
                                  </div>
                                </div>
                                <div
                                  class={`d-flex flex-row flex-grow-1 align-items-center p-2 ${styles.subcategoryTitle}`}
                                >
                                  <Show when={isSectionInGuide(title, subtitle)}>
                                    <div>
                                      <A
                                        href={`${GUIDE_PATH}#${getNormalizedName({
                                          title: title,
                                          subtitle: subtitle,
                                          grouped: true,
                                        })}`}
                                        state={{ from: 'explore' }}
                                        class={`position-relative btn btn-link p-0 pe-2 ${styles.btnIcon}`}
                                      >
                                        <SVGIcon kind={SVGIconKind.Guide} />
                                      </A>
                                    </div>
                                  </Show>
                                  <div class="flex-grow-1 text-truncate">
                                    {subtitle} ({items().length})
                                  </div>
                                </div>
                              </div>
                              <CardList
                                items={items()}
                                isVisible={props.isVisible}
                                sorted={props.sorted}
                                direction={props.direction}
                              />
                            </div>
                          );
                        }}
                      </For>
                    </Match>
                    <Match when={Array.isArray(content())}>
                      <div id={`card_${props.classify}--${title}`} class={`mb-3 ${styles.section}`}>
                        <div class={`d-flex flex-row fw-semibold mb-4 ${styles.title}`}>
                          <div class={`d-flex flex-row flex-grow-1 align-items-center p-2 ${styles.subcategoryTitle}`}>
                            <div class="flex-grow-1 text-truncate text-capitalize">
                              {title === 'undefined' ? 'None' : title} ({(content() as (BaseItem | Item)[]).length})
                            </div>
                          </div>
                        </div>
                        <CardList
                          items={content() as (BaseItem | Item)[]}
                          isVisible={props.isVisible}
                          sorted={props.sorted}
                          direction={props.direction}
                        />
                      </div>
                    </Match>
                  </Switch>
                </div>
              );
            }}
          </For>
        </Match>
      </Switch>
    </Show>
  );
};

export default Content;
