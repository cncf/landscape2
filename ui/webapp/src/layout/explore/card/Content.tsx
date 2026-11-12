import { A } from '@solidjs/router';
import { formatTAGName, SVGIcon, SVGIconKind } from 'common';
import intersection from 'lodash/intersection';
import isUndefined from 'lodash/isUndefined';
import { For, Show } from 'solid-js';

import { COLORS, GUIDE_PATH } from '../../../data';
import { Category, ClassifyOption, LandscapeItem, SortDirection, SortOption, Subcategory } from '../../../types';
import { getAnchorId } from '../../../utils/anchorIds';
import getSectionLabel from '../../../utils/getSectionLabel';
import isSectionInGuide from '../../../utils/isSectionInGuide';
import { CardData } from '../../../utils/itemsDataGetter';
import sortItems from '../../../utils/sortItems';
import sortMaturityStatusTitles from '../../../utils/sortMenuOptions';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import Card from './Card';
import styles from './Content.module.css';

interface Props {
  data: CardData;
  classify: ClassifyOption;
  sorted: SortOption;
  direction: SortDirection;
  isVisible: boolean;
}

/** Card data classified by category or by a classification option. */
type ClassifiedCardData = Exclude<CardData, LandscapeItem[]>;

/** Items of each subcategory of a category. */
type SubsectionItems = { [subcategory: string]: LandscapeItem[] };

interface ListProps {
  items: LandscapeItem[];
  sorted: SortOption;
  direction: SortDirection;
  isVisible: boolean;
}

const CardList = (props: ListProps) => {
  const updateActiveItemId = useUpdateActiveItemId();
  const itemsList = () => props.items;
  const items = () => sortItems(itemsList(), props.sorted, props.direction);

  return (
    <div class="row g-4 mb-4" role="list">
      <For each={items()}>
        {(item: LandscapeItem) => {
          return (
            <div class="col-12 col-lg-6 col-xxl-4 col-xxxl-3" role="listitem">
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
  // The list of items when the Card view is not classified
  const itemsList = (): LandscapeItem[] | undefined => (Array.isArray(props.data) ? props.data : undefined);
  // The items by category or classification option otherwise
  const classifiedData = (): ClassifiedCardData | undefined => (Array.isArray(props.data) ? undefined : props.data);

  const getSubtitles = (content: SubsectionItems, title: string): string[] => {
    let subtitles = Object.keys(content).sort();
    if (props.classify === ClassifyOption.Category && window.baseDS.categories_overridden?.includes(title)) {
      const currentCategory = (window.baseDS.categories ?? []).find((c: Category) => c.name === title);
      if (currentCategory) {
        const subcategories: string[] = currentCategory.subcategories.map((s: Subcategory) => s.name);
        subtitles = intersection(subcategories, subtitles);
      }
    }

    return subtitles;
  };

  return (
    <Show
      when={classifiedData()}
      fallback={
        <CardList
          items={itemsList() ?? []}
          isVisible={props.isVisible}
          sorted={props.sorted}
          direction={props.direction}
        />
      }
    >
      {(data) => (
        <For each={sortMaturityStatusTitles(Object.keys(data()))}>
          {(title: string) => {
            const content = () => data()[title];
            // Categories hold the items of each subcategory, classification options hold a list
            const subsections = (): SubsectionItems | undefined => {
              const sectionContent = content();
              return Array.isArray(sectionContent) ? undefined : sectionContent;
            };
            const sectionItems = (): LandscapeItem[] => {
              const sectionContent = content();
              return Array.isArray(sectionContent) ? sectionContent : [];
            };

            return (
              <div>
                <Show
                  when={subsections()}
                  fallback={
                    <div id={`card_${props.classify}--${title}`} class={`mb-3 ${styles.section}`}>
                      <div class={`d-flex flex-row fw-semibold mb-4 ${styles.title}`}>
                        <div class={`d-flex flex-row flex-grow-1 align-items-center p-2 ${styles.subcategoryTitle}`}>
                          <div class="flex-grow-1 text-truncate text-capitalize">
                            {getSectionLabel(title, props.classify === ClassifyOption.TAG)} ({sectionItems().length})
                          </div>
                        </div>
                      </div>
                      <CardList
                        items={sectionItems()}
                        isVisible={props.isVisible}
                        sorted={props.sorted}
                        direction={props.direction}
                      />
                    </div>
                  }
                >
                  {(subsectionsContent) => {
                    const numItems = () => countItems(subsectionsContent());

                    return (
                      <For each={getSubtitles(subsectionsContent(), title)}>
                        {(subtitle: string) => {
                          const items = () => subsectionsContent()[subtitle];
                          if (items().length === 0) return null;

                          const id = getAnchorId({ title, subtitle, grouped: true });

                          return (
                            <div id={isUndefined(id) ? undefined : `card_${id}`} class={`mb-3 ${styles.section}`}>
                              <div class={`d-flex flex-row fw-semibold mb-4 ${styles.title}`}>
                                <div
                                  class={`d-flex flex-row align-items-center p-2 ${styles.categoryTitle}`}
                                  style={{ 'background-color': bgColor }}
                                >
                                  <Show when={isSectionInGuide(title) && getAnchorId({ title })}>
                                    {(guideAnchorId) => (
                                      <div>
                                        <A
                                          href={`${GUIDE_PATH}#${guideAnchorId()}`}
                                          state={{ from: 'explore' }}
                                          class={`position-relative btn btn-link text-white p-0 pe-2 ${styles.btnIcon}`}
                                          aria-label={`Open section ${title} on guide page`}
                                        >
                                          <SVGIcon kind={SVGIconKind.Guide} />
                                        </A>
                                      </div>
                                    )}
                                  </Show>
                                  <div class="text-white text-nowrap text-truncate">
                                    {title} ({numItems()})
                                  </div>
                                </div>
                                <div
                                  class={`d-flex flex-row flex-grow-1 align-items-center p-2 ${styles.subcategoryTitle}`}
                                >
                                  <Show when={isSectionInGuide(title, subtitle) && id}>
                                    {(guideAnchorId) => (
                                      <div>
                                        <A
                                          href={`${GUIDE_PATH}#${guideAnchorId()}`}
                                          state={{ from: 'explore' }}
                                          class={`position-relative btn btn-link p-0 pe-2 ${styles.btnIcon}`}
                                          aria-label={`Open section ${title}/${subtitle} on guide page`}
                                        >
                                          <SVGIcon kind={SVGIconKind.Guide} />
                                        </A>
                                      </div>
                                    )}
                                  </Show>
                                  <div class="flex-grow-1 text-truncate">
                                    {props.classify === ClassifyOption.TAG ? formatTAGName(subtitle) : subtitle} (
                                    {items().length})
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
                    );
                  }}
                </Show>
              </div>
            );
          }}
        </For>
      )}
    </Show>
  );
};

export default Content;

/** Counts the items of every subcategory of a category. */
const countItems = (content: SubsectionItems): number =>
  Object.values(content).reduce((total: number, items: LandscapeItem[]) => total + items.length, 0);
