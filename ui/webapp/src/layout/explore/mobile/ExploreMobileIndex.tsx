import { Loading } from 'common';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createMemo, For, Match, Show, Switch } from 'solid-js';

import { COLORS } from '../../../data';
import { CardMenu, ClassifyOption, LandscapeItem, SortDirection, SortOption, ViewMode } from '../../../types';
import { getAnchorId } from '../../../utils/anchorIds';
import getCategoriesWithItems from '../../../utils/getCategoriesWithItems';
import getGroupName from '../../../utils/getGroupName';
import getSectionLabel from '../../../utils/getSectionLabel';
import { CardData, CategoriesData } from '../../../utils/itemsDataGetter';
import sortItems from '../../../utils/sortItems';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import sortSubcategories from '../../../utils/sortSubcategories';
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
  data?: CategoriesData;
  cardData?: CardData;
  menu?: CardMenu;
  classify: ClassifyOption;
  sorted: SortOption;
  direction: SortDirection;
}

interface ListProps {
  items: LandscapeItem[];
  sorted: SortOption;
  direction: SortDirection;
}

const CardsList = (props: ListProps) => {
  const updateActiveItemId = useUpdateActiveItemId();
  const items = () => props.items;

  return (
    <div class="row g-2 mb-2">
      <For each={sortItems(items(), props.sorted, props.direction)}>
        {(item: LandscapeItem) => {
          return (
            <div class="col-12 col-sm-6">
              <div
                class={`card rounded-0 p-3 ${styles.card}`}
                classList={{
                  [styles.archived]: item.maturity === 'archived',
                }}
              >
                <button
                  type="button"
                  class={`position-absolute top-0 start-0 w-100 h-100 p-0 border-0 bg-transparent ${styles.cardBtn}`}
                  aria-label={`Open ${item.name} details`}
                  onClick={() => updateActiveItemId(item.id)}
                />
                <Card item={item} logoClass={styles.logo} class={`h-100 ${styles.cardContent}`} />
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
  // The Card view menu, empty while there is none
  const menu = (): CardMenu => props.menu ?? {};
  // The Card view data is a list of items when it is not classified
  const unclassifiedItems = (): LandscapeItem[] => {
    const data = cardData();
    return Array.isArray(data) ? data : [];
  };
  const selectedViewMode = useViewMode();
  const selectedGroup = useGroupActive();
  // Grid sections come from the grid data, whatever the Card view classification is
  const gridMenu = createMemo(() => {
    const gridData = data();
    return isUndefined(gridData) ? {} : getGridMenu(gridData);
  });
  const indexMenu = (): CardMenu => (selectedViewMode() === ViewMode.Grid ? gridMenu() : menu());

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
          <Show when={!isEmpty(indexMenu())} fallback={<Loading />}>
            <Menu menu={indexMenu()} sticky={false} onClickOption={props.closeMenuStatus} isVisible />
          </Show>
        </div>
      </Sidebar>

      <Switch>
        <Match when={selectedViewMode() === ViewMode.Grid}>
          <For each={Object.keys(gridMenu())}>
            {(title) => {
              return (
                <>
                  <div class={`d-flex flex-row fw-semibold mb-2 ${styles.title}`}>
                    <div class="d-flex flex-row align-items-center p-2 w-100" style={{ 'background-color': COLORS[1] }}>
                      <div class="text-white text-nowrap text-truncate text-uppercase">{title}</div>
                    </div>
                  </div>
                  <For each={gridMenu()[title]}>
                    {(subtitle: string) => {
                      const items = () => data()?.[title]?.[subtitle]?.items ?? [];
                      const id = getAnchorId({ title: title, subtitle: subtitle, grouped: true });

                      return (
                        <div id={isUndefined(id) ? undefined : `card_${id}`} class={`mb-3 ${styles.section}`}>
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
        </Match>
        <Match when={selectedViewMode() === ViewMode.Card}>
          <Switch>
            <Match when={props.classify === ClassifyOption.Category}>
              <Show when={!isEmpty(menu())}>
                <For each={Object.keys(menu())}>
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
                        <For each={menu()[title]}>
                          {(subtitle: string) => {
                            const items = () => getCardSectionItems(cardData(), title, subtitle);
                            if (items().length === 0) return null;

                            const id = getAnchorId({ title: title, subtitle: subtitle, grouped: true });

                            return (
                              <div id={isUndefined(id) ? undefined : `card_${id}`} class={`mb-3 ${styles.section}`}>
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
              <Show when={!isEmpty(menu())}>
                <For each={Object.keys(menu())}>
                  {(title) => {
                    return (
                      <For each={menu()[title]}>
                        {(subtitle: string) => {
                          const items = () => getCardSectionItems(cardData(), subtitle);
                          if (items().length === 0) return null;

                          const id = getAnchorId({
                            title: ClassifyOption.Maturity,
                            subtitle: subtitle,
                            grouped: true,
                          });

                          return (
                            <>
                              <div
                                id={isUndefined(id) ? undefined : `card_${id}`}
                                class={`d-flex flex-row fw-semibold mb-2 ${styles.title} ${styles.section}`}
                              >
                                <div
                                  class="d-flex flex-row align-items-center p-2 w-100"
                                  style={{ 'background-color': COLORS[0] }}
                                >
                                  <div class="text-white text-nowrap text-truncate text-uppercase">
                                    {getSectionLabel(subtitle)}
                                  </div>
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
            <Match when={props.classify === ClassifyOption.TAG}>
              <Show when={!isEmpty(menu())}>
                <For each={Object.keys(menu())}>
                  {(title) => {
                    return (
                      <For each={menu()[title]}>
                        {(subtitle: string) => {
                          const items = () => getCardSectionItems(cardData(), subtitle);
                          if (items().length === 0) return null;

                          const id = getAnchorId({
                            title: ClassifyOption.TAG,
                            subtitle: subtitle,
                            grouped: true,
                          });

                          return (
                            <>
                              <div
                                id={isUndefined(id) ? undefined : `card_${id}`}
                                class={`d-flex flex-row fw-semibold mb-2 ${styles.title} ${styles.section}`}
                              >
                                <div
                                  class="d-flex flex-row align-items-center p-2 w-100"
                                  style={{ 'background-color': COLORS[0] }}
                                >
                                  <div class="text-white text-nowrap text-truncate text-uppercase">
                                    {getSectionLabel(subtitle, true)}
                                  </div>
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
              <CardsList items={unclassifiedItems()} sorted={props.sorted} direction={props.direction} />
            </Match>
          </Switch>
          <ButtonToTopScroll />
        </Match>
      </Switch>
    </div>
  );
};

export default ExploreMobileIndex;

/**
 * Builds the index of the Grid view from its data: the categories with items in
 * grid order, each with its subcategories that have items.
 */
const getGridMenu = (data: CategoriesData): CardMenu => {
  const gridMenu: CardMenu = {};
  for (const category of getCategoriesWithItems(data)) {
    const subcategories = Object.keys(data[category]).filter(
      (subcategory) => data[category][subcategory].items.length > 0
    );
    gridMenu[category] = sortSubcategories(category, subcategories);
  }
  return gridMenu;
};

/**
 * Returns the items of a Card view section: the items of a classification option, or
 * those of a subcategory when the category is given. Empty when the section has none.
 */
const getCardSectionItems = (cardData: CardData | undefined, section: string, subsection?: string): LandscapeItem[] => {
  if (isUndefined(cardData) || Array.isArray(cardData)) return [];

  const content = cardData[section];
  if (isUndefined(subsection)) {
    return Array.isArray(content) ? content : [];
  }
  return Array.isArray(content) ? [] : (content?.[subsection] ?? []);
};
