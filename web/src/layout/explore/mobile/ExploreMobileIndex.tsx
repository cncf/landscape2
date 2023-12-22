import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';
import { createEffect, createSignal, For, Match, onMount, Show, Switch } from 'solid-js';

import { COLORS } from '../../../data';
import { CardMenu, Item, ViewMode } from '../../../types';
import getNormalizedName from '../../../utils/getNormalizedName';
import { CategoriesData } from '../../../utils/prepareData';
import prepareMenu from '../../../utils/prepareMenu';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import Loading from '../../common/Loading';
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
  categories_overridden?: string[];
  finishLoading: () => void;
}

const ExploreMobileIndex = (props: Props) => {
  const data = () => props.data;
  const selectedViewMode = useViewMode();
  const updateActiveItemId = useUpdateActiveItemId();
  const selectedGroup = useGroupActive();
  const [menu, setMenu] = createSignal<CardMenu>({});

  const sortItems = (items: Item[]): Item[] =>
    orderBy(items, [(item: Item) => item.name.toLowerCase().toString()], 'asc');

  createEffect(() => {
    const menu = prepareMenu(data(), props.categories_overridden);
    setMenu(menu);
  });

  onMount(() => {
    props.finishLoading();
  });

  return (
    <div>
      <Sidebar
        label="Index"
        header={selectedGroup() || 'Index'}
        visibleButton={false}
        open={props.openMenuStatus}
        onOpenStatusChange={props.closeMenuStatus}
      >
        <div class="position-relative">
          <Show when={!isEmpty(menu())} fallback={<Loading />}>
            <Menu menu={menu} sticky={false} onClickOption={props.closeMenuStatus} isVisible />
          </Show>
        </div>
      </Sidebar>

      <Show when={!isEmpty(menu())}>
        <For each={Object.keys(menu())}>
          {(cat) => {
            return (
              <>
                <div class={`d-flex flex-row fw-semibold mb-2 ${styles.title}`}>
                  <div class="d-flex flex-row align-items-center p-2 w-100" style={{ 'background-color': COLORS[1] }}>
                    <div class="text-white text-nowrap text-truncate text-uppercase">{cat}</div>
                  </div>
                </div>
                <For each={menu()[cat]}>
                  {(subcat: string) => {
                    const items = () => (data()[cat] && data()[cat][subcat] ? data()[cat][subcat]!.items : []);
                    if (items().length === 0) return null;

                    const id = getNormalizedName({ cat: cat, subcat: subcat, grouped: true });

                    return (
                      <div id={`card_${id}`} class="mb-3">
                        <div class={`d-flex flex-row fw-semibold mb-3 ${styles.title}`}>
                          <div
                            class="d-flex flex-row align-items-center p-2 w-100"
                            style={{ 'background-color': COLORS[0] }}
                          >
                            <div class="text-white text-nowrap text-truncate">{subcat}</div>
                          </div>
                        </div>
                        <Switch>
                          <Match when={selectedViewMode() === ViewMode.Grid}>
                            <MobileGrid items={sortItemsByOrderValue(items())} bgColor={COLORS[0]} />
                          </Match>
                          <Match when={selectedViewMode() === ViewMode.Card}>
                            <div class="row g-2 mb-2">
                              <For each={sortItems(items())}>
                                {(item: Item) => {
                                  return (
                                    <div class="col-12 col-sm-6">
                                      <div
                                        class={`card rounded-0 p-3 ${styles.card}`}
                                        classList={{
                                          [styles.archived]:
                                            !isUndefined(item.maturity) && item.maturity === 'archived',
                                        }}
                                        onClick={() => updateActiveItemId(item.id)}
                                      >
                                        <Card
                                          item={item}
                                          logoClass={styles.logo}
                                          class={`h-100 ${styles.cardContent}`}
                                          isVisible
                                        />
                                      </div>
                                    </div>
                                  );
                                }}
                              </For>
                            </div>
                          </Match>
                        </Switch>
                      </div>
                    );
                  }}
                </For>
              </>
            );
          }}
        </For>
      </Show>
    </div>
  );
};

export default ExploreMobileIndex;
