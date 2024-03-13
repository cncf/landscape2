import { A } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import { For, Match, Show, Switch } from 'solid-js';

import { COLORS } from '../../../data';
import { BaseItem, Item, SortOption, SVGIconKind } from '../../../types';
import getNormalizedName from '../../../utils/getNormalizedName';
import isSectionInGuide from '../../../utils/isSectionInGuide';
import sortItems from '../../../utils/sortItems';
import SVGIcon from '../../common/SVGIcon';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import Card from './Card';
import styles from './Content.module.css';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  sorted: SortOption;
  isVisible: boolean;
}

interface ListProps {
  items: BaseItem[];
  sorted: SortOption;
  isVisible: boolean;
}

const CardList = (props: ListProps) => {
  const updateActiveItemId = useUpdateActiveItemId();
  const items = () => sortItems(props.items, props.sorted);

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
  const data = () => props.data;

  return (
    <Show when={!isUndefined(data())}>
      <Switch>
        <Match when={Array.isArray(data())}>
          <CardList items={data()} isVisible={props.isVisible} sorted={props.sorted} />
        </Match>
        <Match when={!Array.isArray(data())}>
          <For each={Object.keys(data()).sort()}>
            {(title: string) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const content = (data() as any)[title] as { [key: string]: unknown } | (BaseItem | Item)[];
              return (
                <div>
                  <Switch>
                    <Match when={!Array.isArray(content)}>
                      <For each={Object.keys(content)}>
                        {(subtitle: string) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const items = () => (content as any)[subtitle];
                          if (items().length === 0) return null;

                          const id = getNormalizedName({ cat: title, subcat: subtitle, grouped: true });

                          return (
                            <div id={`card_${id}`} class="mb-3">
                              <div class={`d-flex flex-row fw-semibold mb-4 ${styles.title}`}>
                                <div
                                  class={`d-flex flex-row align-items-center p-2 ${styles.categoryTitle}`}
                                  style={{ 'background-color': bgColor }}
                                >
                                  <Show when={isSectionInGuide(title)}>
                                    <div>
                                      <A
                                        href={`/guide#${getNormalizedName({ cat: title })}`}
                                        state={{ from: 'explore' }}
                                        class={`position-relative btn btn-link text-white p-0 pe-2 ${styles.btnIcon}`}
                                      >
                                        <SVGIcon kind={SVGIconKind.Guide} />
                                      </A>
                                    </div>
                                  </Show>
                                  <div class="text-white text-nowrap text-truncate">{title}</div>
                                </div>
                                <div
                                  class={`d-flex flex-row flex-grow-1 align-items-center p-2 ${styles.subcategoryTitle}`}
                                >
                                  <Show when={isSectionInGuide(title, subtitle)}>
                                    <div>
                                      <A
                                        href={`/guide#${getNormalizedName({ cat: title, subcat: subtitle, grouped: true })}`}
                                        state={{ from: 'explore' }}
                                        class={`position-relative btn btn-link p-0 pe-2 ${styles.btnIcon}`}
                                      >
                                        <SVGIcon kind={SVGIconKind.Guide} />
                                      </A>
                                    </div>
                                  </Show>
                                  <div class="flex-grow-1 text-truncate">{subtitle}</div>
                                </div>
                              </div>
                              <CardList items={items()} isVisible={props.isVisible} sorted={props.sorted} />
                            </div>
                          );
                        }}
                      </For>
                    </Match>
                    <Match when={Array.isArray(content)}>
                      <div id={`card_${title}`} class="mb-3">
                        <div class={`d-flex flex-row fw-semibold mb-4 ${styles.title}`}>
                          <div class={`d-flex flex-row flex-grow-1 align-items-center p-2 ${styles.subcategoryTitle}`}>
                            <div class="flex-grow-1 text-truncate text-capitalize">
                              {title === 'undefined' ? 'None' : title}
                            </div>
                          </div>
                        </div>
                        <CardList
                          items={content as (BaseItem | Item)[]}
                          isVisible={props.isVisible}
                          sorted={props.sorted}
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
