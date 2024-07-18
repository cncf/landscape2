import { Loading } from 'common';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { For, Match, Show, Switch } from 'solid-js';

import { COLORS } from '../../../data';
import { CardMenu, ClassifyOption, Item, SortDirection, SortOption, ViewMode } from '../../../types';
import getGroupName from '../../../utils/getGroupName';
import getNormalizedName from '../../../utils/getNormalizedName';
import { CategoriesData } from '../../../utils/itemsDataGetter';
import sortItems from '../../../utils/sortItems';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import ButtonToTopScroll from '../../common/ButtonToTopScroll';
import { Sidebar } from '../../common/Sidebar';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import { useGroupActive } from '../../stores/groupActive';
import { useViewMode } from '../../stores/viewMode';
import Menu from '../card/Menu';
import Card from './Card';
import styles from './ExploreMobileIndex.module.css';
import MobileGrid from './MobileGrid';

interface Props {
  openMenuStatus: boolean;
  closeMenuStatus: () => void;
  data: CategoriesData;
  cardData: unknown;
  menu?: CardMenu;
  categories_overridden?: string[];
  classify: ClassifyOption;
  sorted: SortOption;
  direction: SortDirection;
}

interface ListProps {
  items: Item[];
  sorted: SortOption;
  direction: SortDirection;
}

const CardsList = (props: ListProps) => {
  const updateActiveItemId = useUpdateActiveItemId();
  const items = () => props.items;

  return (
    <div class="row g-2 mb-2">
      <For each={sortItems(items(), props.sorted, props.direction)}>
        {(item: Item) => {
          return (
            <div class="col-12 col-sm-6">
              <div
                class={`card rounded-0 p-3 ${styles.card}`}
                classList={{
                  [styles.archived]: !isUndefined(item.maturity) && item.maturity === 'archived',
                }}
                onClick={() => updateActiveItemId(item.id)}
              >
                <Card item={item} logoClass={styles.logo} class={`h-100 ${styles.cardContent}`} isVisible />
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
};

const ExploreMobileIndex = (props: Props) => {
  const data = () => props.data;
  const cardData = () => props.cardData;
  const menu = () => props.menu;
  const selectedViewMode = useViewMode();
  const selectedGroup = useGroupActive();

  return (
    <div>
      <Sidebar
        label="Index"
        header={getGroupName(selectedGroup()) || 'Index'}
        visibleButton={false}
        open={props.openMenuStatus}
        onOpenStatusChange={props.closeMenuStatus}
      >
        <div class="position-relative">
          <Show when={!isUndefined(menu()) && !isEmpty(menu())} fallback={<Loading />}>
            <Menu menu={menu()!} sticky={false} onClickOption={props.closeMenuStatus} isVisible />
          </Show>
        </div>
      </Sidebar>

      <Switch>
        <Match when={selectedViewMode() === ViewMode.Grid}>
          <Show when={!isUndefined(menu()) && !isEmpty(menu())}>
            <For each={Object.keys(menu()!)}>
              {(title) => {
                return (
                  <>
                    <div class={`d-flex flex-row fw-semibold mb-2 ${styles.title}`}>
                      <div
                        class="d-flex flex-row align-items-center p-2 w-100"
                        style={{ 'background-color': COLORS[1] }}
                      >
                        <div class="text-white text-nowrap text-truncate text-uppercase">{title}</div>
                      </div>
                    </div>
                    <For each={menu()![title]}>
                      {(subtitle: string) => {
                        const items = () =>
                          data()[title] && data()[title][subtitle] ? data()[title][subtitle]!.items : [];
                        if (items().length === 0) return null;

                        const id = getNormalizedName({ title: title, subtitle: subtitle, grouped: true });

                        return (
                          <div id={`card_${id}`} class={`mb-3 ${styles.section}`}>
                            <div class={`d-flex flex-row fw-semibold mb-3 ${styles.title}`}>
                              <div
                                class="d-flex flex-row align-items-center p-2 w-100"
                                style={{ 'background-color': COLORS[0] }}
                              >
                                <div class="text-white text-nowrap text-truncate">{subtitle}</div>
                              </div>
                            </div>
                            <MobileGrid items={sortItemsByOrderValue(items())} bgColor={COLORS[0]} />
                          </div>
                        );
                      }}
                    </For>
                  </>
                );
              }}
            </For>
          </Show>
        </Match>
        <Match when={selectedViewMode() === ViewMode.Card}>
          <Switch>
            <Match when={props.classify === ClassifyOption.Category}>
              <Show when={!isUndefined(menu()) && !isEmpty(menu())}>
                <For each={Object.keys(menu()!)}>
                  {(title) => {
                    return (
                      <>
                        <div class={`d-flex flex-row fw-semibold mb-2 ${styles.title}`}>
                          <div
                            class="d-flex flex-row align-items-center p-2 w-100"
                            style={{ 'background-color': COLORS[1] }}
                          >
                            <div class="text-white text-nowrap text-truncate text-uppercase">{title}</div>
                          </div>
                        </div>
                        <For each={menu()![title]}>
                          {(subtitle: string) => {
                            const items = () =>
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              (cardData() as any)[title] && (cardData() as any)[title][subtitle]
                                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (cardData() as any)[title][subtitle]
                                : [];
                            if (items().length === 0) return null;

                            const id = getNormalizedName({ title: title, subtitle: subtitle, grouped: true });

                            return (
                              <div id={`card_${id}`} class={`mb-3 ${styles.section}`}>
                                <div class={`d-flex flex-row fw-semibold mb-3 ${styles.title}`}>
                                  <div
                                    class="d-flex flex-row align-items-center p-2 w-100"
                                    style={{ 'background-color': COLORS[0] }}
                                  >
                                    <div class="text-white text-nowrap text-truncate">{subtitle}</div>
                                  </div>
                                </div>
                                <CardsList items={items()} sorted={props.sorted} direction={props.direction} />
                              </div>
                            );
                          }}
                        </For>
                      </>
                    );
                  }}
                </For>
              </Show>
            </Match>
            <Match when={props.classify === ClassifyOption.Maturity}>
              <Show when={!isUndefined(menu()) && !isEmpty(menu())}>
                <For each={Object.keys(menu()!)}>
                  {(title) => {
                    return (
                      <For each={menu()![title]}>
                        {(subtitle: string) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const items = () => ((cardData() as any)[subtitle] ? (cardData() as any)[subtitle] : []);
                          if (items().length === 0) return null;

                          const id = getNormalizedName({
                            title: ClassifyOption.Maturity,
                            subtitle: subtitle,
                            grouped: true,
                          });

                          return (
                            <>
                              <div
                                id={`card_${id}`}
                                class={`d-flex flex-row fw-semibold mb-2 ${styles.title} ${styles.section}`}
                              >
                                <div
                                  class="d-flex flex-row align-items-center p-2 w-100"
                                  style={{ 'background-color': COLORS[0] }}
                                >
                                  <div class="text-white text-nowrap text-truncate text-uppercase">{subtitle}</div>
                                </div>
                              </div>
                              <CardsList items={items()} sorted={props.sorted} direction={props.direction} />
                            </>
                          );
                        }}
                      </For>
                    );
                  }}
                </For>
              </Show>
            </Match>
            <Match when={props.classify === ClassifyOption.None}>
              <CardsList items={cardData() as Item[]} sorted={props.sorted} direction={props.direction} />
            </Match>
          </Switch>
          <ButtonToTopScroll />
        </Match>
      </Switch>
    </div>
  );
};

export default ExploreMobileIndex;
