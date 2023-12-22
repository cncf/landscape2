import { A } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';
import { Accessor, For, Show } from 'solid-js';

import { COLORS } from '../../../data';
import { BaseItem, CardMenu, Item, SVGIconKind } from '../../../types';
import getNormalizedName from '../../../utils/getNormalizedName';
import isSectionInGuide from '../../../utils/isSectionInGuide';
import { CategoriesData } from '../../../utils/prepareData';
import SVGIcon from '../../common/SVGIcon';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import Card from './Card';
import styles from './Content.module.css';

interface Props {
  menu: Accessor<CardMenu>;
  data: CategoriesData;
  isVisible: boolean;
}

const Content = (props: Props) => {
  const bgColor = COLORS[0];
  const updateActiveItemId = useUpdateActiveItemId();
  const data = () => props.data;

  return (
    <For each={Object.keys(props.menu())}>
      {(cat: string) => {
        return (
          <div>
            <For each={props.menu()[cat]}>
              {(subcat: string) => {
                // Do not render empty subcategories
                const sortedItems = () =>
                  orderBy(data()[cat][subcat].items, [(item: BaseItem) => item.name.toLowerCase().toString()], 'asc');

                if (sortedItems().length === 0) return null;

                const id = getNormalizedName({ cat: cat, subcat: subcat, grouped: true });

                return (
                  <div id={`card_${id}`}>
                    <div class={`d-flex flex-row fw-semibold mb-4 ${styles.title}`}>
                      <div
                        class={`d-flex flex-row align-items-center p-2 ${styles.categoryTitle}`}
                        style={{ 'background-color': bgColor }}
                      >
                        <Show when={isSectionInGuide(cat)}>
                          <div>
                            <A
                              href={`/guide#${getNormalizedName({ cat: cat })}`}
                              state={{ from: 'explore' }}
                              class={`position-relative btn btn-link text-white p-0 pe-2 ${styles.btnIcon}`}
                            >
                              <SVGIcon kind={SVGIconKind.Guide} />
                            </A>
                          </div>
                        </Show>
                        <div class="text-white text-nowrap text-truncate">{cat}</div>
                      </div>
                      <div class={`d-flex flex-row flex-grow-1 align-items-center p-2 ${styles.subcategoryTitle}`}>
                        <Show when={isSectionInGuide(cat, subcat)}>
                          <div>
                            <A
                              href={`/guide#${getNormalizedName({ cat: cat, subcat: subcat, grouped: true })}`}
                              state={{ from: 'explore' }}
                              class={`position-relative btn btn-link p-0 pe-2 ${styles.btnIcon}`}
                            >
                              <SVGIcon kind={SVGIconKind.Guide} />
                            </A>
                          </div>
                        </Show>
                        <div class="flex-grow-1 text-truncate">{subcat}</div>
                      </div>
                    </div>
                    <div class="row g-4 mb-4">
                      <For each={sortedItems()}>
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
                  </div>
                );
              }}
            </For>
          </div>
        );
      }}
    </For>
  );
};

export default Content;
