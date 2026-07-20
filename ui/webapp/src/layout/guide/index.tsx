import { useLocation, useNavigate } from '@solidjs/router';
import { Loading, NoData, SVGIcon, SVGIconKind, useBreakpointDetect } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, For, Match, on, onMount, Show, Switch } from 'solid-js';

import { GUIDE_PATH, SMALL_DEVICES_BREAKPOINTS } from '../../data';
import { CategoryGuide, Guide, StateContent, SubcategoryGuide, ToCTitle } from '../../types';
import goToElement from '../../utils/goToElement';
import isElementInView from '../../utils/isElementInView';
import buildNormalizedId from '../../utils/normalizeId';
import scrollToTop from '../../utils/scrollToTop';
import ButtonToTopScroll from '../common/ButtonToTopScroll';
import { Sidebar } from '../common/Sidebar';
import Footer from '../navigation/Footer';
import { useGuideFileContent, useGuideTOC, useSetGuideFileContent, useSetGuideTOC } from '../stores/guideFile';
import { useMobileTOCStatus, useSetMobileTOCStatus } from '../stores/mobileTOC';
import styles from './Guide.module.css';
import SubcategoryExtended from './SubcategoryExtended';
import ToC from './ToC';

type GuideLoadStatus = 'error' | 'loading' | 'ready';

const GuideIndex = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const guideContent = useGuideFileContent();
  const setGuideContent = useSetGuideFileContent();
  const [guide, setGuide] = createSignal<Guide>();
  const [guideLoadStatus, setGuideLoadStatus] = createSignal<GuideLoadStatus>('loading');
  const guideToc = useGuideTOC();
  const setGuideToc = useSetGuideTOC();
  const [toc, setToc] = createSignal<ToCTitle[]>([]);
  const state = createMemo(() => location.state || {});
  const [firstItem, setFirstItem] = createSignal<string>();
  const [openToCMobileStatus, setOpenToCMobileStatus] = createSignal<boolean>(false);
  const openMenuTOCFromHeader = useMobileTOCStatus();
  const setMenuTOCFromHeader = useSetMobileTOCStatus();
  const { point } = useBreakpointDetect();
  const onSmallDevice = !isUndefined(point()) && SMALL_DEVICES_BREAKPOINTS.includes(point()!);
  const from = () => (state() as StateContent).from || undefined;

  const prepareToC = (data: Guide) => {
    const content: ToCTitle[] = [];
    data.categories.forEach((cat: CategoryGuide) => {
      const subcategories: ToCTitle[] = [];
      if (cat.subcategories) {
        cat.subcategories.forEach((subcat: SubcategoryGuide) => {
          subcategories.push({
            title: subcat.subcategory,
            id: buildNormalizedId({ title: cat.category, subtitle: subcat.subcategory, grouped: true }),
          });
        });
      }

      content.push({
        title: cat.category,
        id: buildNormalizedId({ title: cat.category }),
        options: subcategories,
      });
    });

    if (content.length > 0) {
      const firstItem = content[0].id;
      setFirstItem(firstItem);
    }

    setToc(content);
    setGuideToc(content);
  };

  const fetchGuide = async () => {
    setGuideLoadStatus('loading');

    try {
      let data = window.guide;
      if (isUndefined(data)) {
        const response = await fetch(
          import.meta.env.MODE === 'development' ? '../../static/data/guide.json' : './data/guide.json'
        );
        if (!response.ok) {
          throw new Error(`Unable to load guide: ${response.status}`);
        }
        data = (await response.json()) as Guide;
      }

      setGuide(data);
      prepareToC(data);
      setGuideContent(data);
      setGuideLoadStatus('ready');
    } catch {
      setGuide(undefined);
      setGuideLoadStatus('error');
    }
  };

  onMount(() => {
    if (isUndefined(guideContent())) {
      void fetchGuide();
    } else {
      setTimeout(() => {
        setFirstItem(guideToc()![0].id);
        setGuide(guideContent());
        setToc(guideToc());
        setGuideLoadStatus('ready');
        if (from() === 'header' && location.hash === '') {
          scrollToTop(false);
          updateRoute(guideToc()![0].id);
        }
      }, 5);
    }
  });

  createEffect(
    on(toc, () => {
      if (toc().length > 0 && firstItem()) {
        const cleanHash = location.hash.replace('#', '');
        if (cleanHash !== '' && cleanHash !== firstItem()) {
          if (!isUndefined(from())) {
            if (['header', 'mobileHeader'].includes(from()!)) {
              updateRoute(firstItem()!);
            } else {
              updateActiveTitle(cleanHash, true);
              scrollInToC();
            }
          } else {
            setTimeout(() => {
              goToElement(`section_${cleanHash}`);
              scrollInToC();
            }, 50);
          }
        } else {
          updateRoute(firstItem()!);
        }
      }
    })
  );

  createEffect(
    on(openMenuTOCFromHeader, () => {
      setOpenToCMobileStatus(openMenuTOCFromHeader());
    })
  );

  const updateRoute = (title: string) => {
    navigate(`${GUIDE_PATH}${location.search}#${title}`, {
      replace: true,
      scroll: false,
      state: { fromMenu: true },
    });
  };

  const openStatusChange = (open: boolean) => {
    setOpenToCMobileStatus(open);
    setMenuTOCFromHeader(open);
  };

  const updateActiveTitle = (title: string, onLoad?: boolean) => {
    updateRoute(title);
    if (onSmallDevice) {
      openStatusChange(false);
    }
    if (title === firstItem()) {
      scrollToTop(onSmallDevice);
    } else {
      if (!isUndefined(onLoad) && onLoad) {
        setTimeout(() => {
          goToElement(`section_${title}`);
        }, 50);
      } else {
        goToElement(`section_${title}`);
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
      <main class="flex-grow-1 container-fluid px-3 px-lg-4 mainPadding position-relative">
        <Show when={guideLoadStatus() === 'ready'}>
          <div class="d-block d-lg-none">
            <Sidebar
              label="Index"
              header="Index"
              visibleButton
              buttonIcon={<SVGIcon kind={SVGIconKind.ToC} />}
              buttonType={`position-relative btn btn-sm btn-secondary text-white btn-sm rounded-0 py-0 mt-3 btnIconMobile ${styles.mobileToCBtn}`}
              open={openToCMobileStatus()}
              onOpenStatusChange={openStatusChange}
            >
              <div class="position-relative">
                <ToC toc={toc()} updateActiveTitle={updateActiveTitle} sticky={false} />
              </div>
            </Sidebar>
          </div>
        </Show>
        <div class="d-flex flex-row" classList={{ [styles.loadingContent]: guideLoadStatus() === 'loading' }}>
          <Switch>
            <Match when={guideLoadStatus() === 'loading'}>
              <Loading spinnerClass="position-fixed top-50 start-50" />
            </Match>
            <Match when={guideLoadStatus() === 'error'}>
              <div class="w-100 py-5">
                <NoData>
                  <div class="d-flex flex-column align-items-center">
                    <div class="fs-5">We couldn't load the guide.</div>
                    <button type="button" class="btn btn-secondary mt-3" onClick={() => void fetchGuide()}>
                      Try again
                    </button>
                  </div>
                </NoData>
              </div>
            </Match>
            <Match when={guideLoadStatus() === 'ready'}>
              <div class="d-none d-lg-flex">
                <ToC toc={toc()} updateActiveTitle={updateActiveTitle} sticky />
              </div>
              <div class="py-3 px-0 p-lg-4 pe-lg-0">
                <div class={`position-relative ${styles.guide}`}>
                  <For each={guide()!.categories}>
                    {(cat, index) => {
                      const id = buildNormalizedId({ title: cat.category });
                      const hasSubcategories = !isUndefined(cat.subcategories) && cat.subcategories.length > 0;

                      return (
                        <>
                          <div
                            id={`section_${id}`}
                            class={styles.section}
                            classList={{ [styles.catSection]: !hasSubcategories }}
                          >
                            <h1
                              class={`border-bottom mb-3 mb-lg-4 pb-2 ${styles.title}`}
                              classList={{ 'mt-4 mt-lg-5': index() !== 0 }}
                            >
                              {cat.category}
                            </h1>
                            <Show when={!isUndefined(cat.content)}>
                              {/* eslint-disable-next-line solid/no-innerhtml */}
                              <div innerHTML={cat.content} />
                            </Show>
                          </div>
                          <Show when={hasSubcategories}>
                            <For each={cat.subcategories}>
                              {(subcat, index) => {
                                const id = buildNormalizedId({
                                  title: cat.category,
                                  subtitle: subcat.subcategory,
                                  grouped: true,
                                });

                                return (
                                  <div
                                    id={`section_${id}`}
                                    class={styles.section}
                                    classList={{ [styles.catSection]: index() === cat.subcategories.length - 1 }}
                                  >
                                    <h2 class={`mt-4 mt-lg-5 mb-3 mb-lg-4 pb-2 border-bottom ${styles.subtitle}`}>
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
                          </Show>
                        </>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Match>
          </Switch>
        </div>
        <Show when={guideLoadStatus() === 'ready'}>
          <ButtonToTopScroll />
        </Show>
      </main>
      <Show when={guideLoadStatus() === 'ready'}>
        <Footer />
      </Show>
    </>
  );
};

export default GuideIndex;
