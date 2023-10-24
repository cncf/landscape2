import { useLocation, useNavigate } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, For, on, onMount, Show } from 'solid-js';

import { CategoryGuide, Guide, SubcategoryGuide, ToCTitle } from '../../types';
import goToElement from '../../utils/goToElement';
import isElementInView from '../../utils/isElementInView';
import slugify from '../../utils/slugify';
import ButtonToTopScroll from '../common/ButtonToTopScroll';
import { Loading } from '../common/Loading';
import Footer from '../navigation/Footer';
import styles from './Guide.module.css';
import SubcategoryExtended from './SubcategoryExtended';
import ToC from './ToC';

interface StateGuide {
  from?: string;
}

const GuideIndex = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [guide, setGuide] = createSignal<Guide | null>();
  const [toc, setToc] = createSignal<ToCTitle[]>([]);
  const state = createMemo(() => location.state || {});
  const [firstItem, setFirstItem] = createSignal<string>();

  const prepareToC = (data: Guide) => {
    const content: ToCTitle[] = [];
    data.categories.forEach((cat: CategoryGuide) => {
      const subcategories: ToCTitle[] = [];
      if (cat.subcategories) {
        cat.subcategories.forEach((subcat: SubcategoryGuide) => {
          subcategories.push({
            title: subcat.subcategory,
            id: slugify(`${cat.category} ${subcat.subcategory}`),
          });
        });
      }

      content.push({
        title: cat.category,
        id: slugify(cat.category),
        options: subcategories,
      });
    });

    if (content.length > 0) {
      const firstItem = content[0].id;
      setFirstItem(firstItem);
    }

    setToc(content);
  };

  onMount(() => {
    async function fetchGuide() {
      try {
        fetch(import.meta.env.MODE === 'development' ? '../../static/guide.json' : './data/guide.json')
          .then((res) => res.json())

          .then((data) => {
            setGuide(data);
            prepareToC(data);
          });
      } catch {
        setGuide(null);
      }
    }

    fetchGuide();
  });

  createEffect(
    on(toc, () => {
      if (toc().length > 0 && firstItem()) {
        const cleanHash = location.hash.replace('#', '');
        if (cleanHash !== '' && cleanHash !== firstItem()) {
          if (!isEmpty(state())) {
            const fromPage = (state() as StateGuide).from || undefined;
            if (fromPage === 'header') {
              updateRoute(firstItem()!);
            } else {
              updateActiveTitle(cleanHash, true);
              scrollInToC();
            }
          } else {
            scrollInToC();
            setTimeout(() => {
              goToElement(`section_${cleanHash}`, 16);
            }, 100);
          }
        } else {
          updateRoute(firstItem()!);
        }
      }
    })
  );

  const updateRoute = (title: string) => {
    navigate(`${location.pathname}${location.search}#${title}`, {
      replace: true,
      scroll: false,
      state: { fromMenu: true },
    });
  };

  const updateActiveTitle = (title: string, onLoad?: boolean) => {
    updateRoute(title);
    if (title === firstItem()) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    } else {
      if (!isUndefined(onLoad) && onLoad) {
        setTimeout(() => {
          goToElement(`section_${title}`, 16);
        }, 100);
      } else {
        goToElement(`section_${title}`, 16);
      }
    }
  };

  const scrollInToC = () => {
    const cleanHash = location.hash.replace('#', '');
    if (!isElementInView(`btn_${cleanHash}`)) {
      const target = window.document.getElementById(`btn_${cleanHash}`);
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  return (
    <>
      <main class="flex-grow-1 container-fluid d-none d-lg-block px-4 position-relative">
        <div class="d-flex flex-row" classList={{ [styles.loadingContent]: isUndefined(guide()) }}>
          <Show when={!isUndefined(guide())} fallback={<Loading spinnerClass="position-fixed top-50 start-50" />}>
            <ToC toc={toc()} updateActiveTitle={updateActiveTitle} />
            <div class="p-4 pe-0">
              <div class={`position-relative ${styles.guide}`}>
                <For each={guide()!.categories}>
                  {(cat, index) => {
                    const id = slugify(cat.category);
                    const hasSubcategories = !isUndefined(cat.subcategories) && cat.subcategories.length > 0;

                    return (
                      <>
                        <div id={`section_${id}`} classList={{ [styles.catSection]: !hasSubcategories }}>
                          <h1 class={`border-bottom mb-4 pb-2 ${styles.title}`} classList={{ 'mt-5': index() !== 0 }}>
                            {cat.category}
                          </h1>
                          <Show when={!isUndefined(cat.content)}>
                            {/* eslint-disable-next-line solid/no-innerhtml */}
                            <div innerHTML={cat.content} />
                          </Show>
                        </div>
                        {hasSubcategories && (
                          <For each={cat.subcategories}>
                            {(subcat, index) => {
                              const id = slugify(`${cat.category} ${subcat.subcategory}`);

                              return (
                                <div
                                  id={`section_${id}`}
                                  classList={{ [styles.catSection]: index() === cat.subcategories.length - 1 }}
                                >
                                  <h2 class={`mt-5 mb-4 pb-2 border-bottom ${styles.subtitle}`}>
                                    {subcat.subcategory}
                                  </h2>
                                  {/* eslint-disable-next-line solid/no-innerhtml */}
                                  <div innerHTML={subcat.content} />
                                  <SubcategoryExtended
                                    keywords={subcat.keywords}
                                    category={cat.category}
                                    subcategory={subcat.subcategory}
                                  />
                                </div>
                              );
                            }}
                          </For>
                        )}
                      </>
                    );
                  }}
                </For>

                <Show when={!isUndefined(firstItem())}>
                  <ButtonToTopScroll firstSection={firstItem()!} />
                </Show>
              </div>
            </div>
          </Show>
        </div>
      </main>
      <Show when={!isUndefined(guide())}>
        <Footer logo={window.baseDS.images.footer_logo} />
      </Show>
    </>
  );
};

export default GuideIndex;
