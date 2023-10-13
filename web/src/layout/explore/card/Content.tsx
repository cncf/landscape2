import { createVisibilityObserver, withDirection, withOccurrence } from '@solid-primitives/intersection-observer';
import { A, useLocation, useNavigate } from '@solidjs/router';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';
import { Accessor, createMemo, For } from 'solid-js';

import { COLORS } from '../../../data';
import { BaseItem, CardMenu, Item, SVGIconKind } from '../../../types';
import convertStringSpaces from '../../../utils/convertStringSpaces';
import isElementInView from '../../../utils/isElementInView';
import isSectionInGuide from '../../../utils/isSectionInGuide';
import { CategoriesData } from '../../../utils/prepareData';
import slugify from '../../../utils/slugify';
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
  const navigate = useNavigate();
  const location = useLocation();
  const state = createMemo(() => location.state);
  const data = () => props.data;

  const useVisibilityObserver = createVisibilityObserver(
    {},
    withOccurrence(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line solid/reactivity
      withDirection((entry, { occurrence, directionY }) => {
        const currentNode = entry.target.id;
        const prevSibling =
          !isNull(window.document.getElementById(entry.target.id)) &&
          !isNull(window.document.getElementById(entry.target.id)!.previousElementSibling)
            ? window.document.getElementById(entry.target.id)!.previousElementSibling!.id
            : undefined;
        const nextSibling =
          !isNull(window.document.getElementById(entry.target.id)) &&
          !isNull(window.document.getElementById(entry.target.id)!.nextElementSibling)
            ? window.document.getElementById(entry.target.id)!.nextElementSibling!.id
            : undefined;

        // Do not trigger handleEnter when we are not scrolling and we go directly to section
        const nodes = [currentNode, prevSibling, nextSibling];

        if (nodes.includes(location.hash.replace('#', ''))) {
          if (directionY === 'Top') {
            if (occurrence === 'Leaving' && !isUndefined(nextSibling)) {
              handleEnter(nextSibling);
            }
            if (occurrence === 'Entering') {
              handleEnter(currentNode);
            }
          }
          if (directionY === 'Bottom') {
            if (!isUndefined(state()) && occurrence === 'Entering') {
              handleEnter(currentNode);
            }
          }
        }
      })
    )
  );

  const handleEnter = (id: string) => {
    if (`#${id}` !== location.hash) {
      navigate(`${location.pathname}${location.search}#${id}`, {
        replace: true,
        scroll: false,
        state: undefined,
      });

      if (!isElementInView(`btn_${id}`)) {
        const target = window.document.getElementById(`btn_${id}`);
        if (target) {
          target.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  };

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

                const id = convertStringSpaces(`${cat}/${subcat}`);
                let ref: HTMLDivElement | undefined;
                useVisibilityObserver(() => props.isVisible && ref);

                return (
                  <div ref={(el) => (ref = el)} id={id}>
                    <div class={`d-flex flex-row fw-semibold mb-4 ${styles.title}`}>
                      <div
                        class={`d-flex flex-row align-items-center p-2 ${styles.categoryTitle}`}
                        style={{ 'background-color': bgColor }}
                      >
                        {isSectionInGuide(cat) && (
                          <div>
                            <A
                              href={`/guide#${slugify(cat)}`}
                              state={{ from: 'explore' }}
                              class={`position-relative btn btn-link text-white p-0 pe-2 ${styles.btnIcon}`}
                            >
                              <SVGIcon kind={SVGIconKind.Guide} />
                            </A>
                          </div>
                        )}
                        <div class="text-white text-nowrap text-truncate">{cat}</div>
                      </div>
                      <div class={`d-flex flex-row flex-grow-1 align-items-center p-2 ${styles.subcategoryTitle}`}>
                        {isSectionInGuide(cat, subcat) && (
                          <div>
                            <A
                              href={`/guide#${slugify(`${cat} ${subcat}`)}`}
                              state={{ from: 'explore' }}
                              class={`position-relative btn btn-link p-0 pe-2 ${styles.btnIcon}`}
                            >
                              <SVGIcon kind={SVGIconKind.Guide} />
                            </A>
                          </div>
                        )}
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
                              >
                                <Card item={item} class="h-100" isVisible={props.isVisible} />
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
