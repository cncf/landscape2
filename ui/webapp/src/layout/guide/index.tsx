import { useLocation, useNavigate } from '@solidjs/router';
import { Loading, NoData, SMALL_DEVICES_BREAKPOINTS, SVGIcon, SVGIconKind, useBreakpointDetect } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, For, Match, on, onMount, Show, Switch } from 'solid-js';

import { GUIDE_PATH } from '../../data';
import { Guide, GuideCategory, GuideSubcategory, StateContent, ToCTitle } from '../../types';
import { getAnchorId } from '../../utils/anchorIds';
import goToElement from '../../utils/goToElement';
import { getGuideUrl } from '../../utils/guideData';
import scrollToTop from '../../utils/scrollToTop';
import ButtonToTopScroll from '../common/ButtonToTopScroll';
import { Sidebar } from '../common/Sidebar';
import Footer from '../navigation/Footer';
import { useGuideFileContent, useGuideTOC, useSetGuideFileContent, useSetGuideTOC } from '../stores/guideFile';
import { useMobileTOCStatus, useSetMobileTOCStatus } from '../stores/mobileTOC';
import styles from './Guide.module.css';
import SubcategoryExtended from './SubcategoryExtended';
import ToC, { getToCOptionId } from './ToC';

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
  const onSmallDevice = () => SMALL_DEVICES_BREAKPOINTS.includes(point());
  const [desktopToC, setDesktopToC] = createSignal<HTMLDivElement>();
  const from = () => (state() as StateContent).from || undefined;

  const prepareToC = (data: Guide) => {
    const content: ToCTitle[] = [];
    (data.categories ?? []).forEach((cat: GuideCategory) => {
      const id = getAnchorId({ title: cat.category }, data);
      if (isUndefined(id)) return;

      const subcategories: ToCTitle[] = [];
      if (cat.subcategories) {
        cat.subcategories.forEach((subcat: GuideSubcategory) => {
          const subcategoryId = getAnchorId({ title: cat.category, subtitle: subcat.subcategory, grouped: true }, data);
          if (!isUndefined(subcategoryId)) {
            subcategories.push({ title: subcat.subcategory, id: subcategoryId });
          }
        });
      }

      content.push({
        title: cat.category,
        id,
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
        const response = await fetch(getGuideUrl());
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
    const cachedGuide = guideContent();
    if (isUndefined(cachedGuide) || cachedGuide === null) {
      void fetchGuide();
    } else {
      const cachedToc = guideToc() ?? [];
      const firstId = cachedToc[0]?.id;
      setFirstItem(firstId);
      setGuide(cachedGuide);
      setToc(cachedToc);
      setGuideLoadStatus('ready');
      if (from() === 'header' && location.hash === '' && !isUndefined(firstId)) {
        scrollToTop(false);
        updateRoute(firstId);
      }
    }
  });

  createEffect(
    on(toc, () => {
      const firstId = firstItem();
      if (toc().length > 0 && firstId) {
        const cleanHash = location.hash.replace('#', '');
        if (cleanHash !== '' && cleanHash !== firstId) {
          const origin = from();
          if (!isUndefined(origin)) {
            if (['header', 'mobileHeader'].includes(origin)) {
              updateRoute(firstId);
            } else {
              updateActiveTitle(cleanHash, true);
              // The desktop ToC is only mounted once the guide renders
              setTimeout(scrollInToC, 50);
            }
          } else {
            setTimeout(() => {
              goToElement(`section_${cleanHash}`);
              scrollInToC();
            }, 50);
          }
        } else {
          updateRoute(firstId);
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
    });
  };

  const openStatusChange = (open: boolean) => {
    setOpenToCMobileStatus(open);
    setMenuTOCFromHeader(open);
  };

  const updateActiveTitle = (title: string, onLoad?: boolean) => {
    updateRoute(title);
    if (onSmallDevice()) {
      openStatusChange(false);
    }
    if (title === firstItem()) {
      scrollToTop(onSmallDevice());
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
    // Does nothing when the ToC option is already visible
    desktopToC()
      ?.querySelector(`#${CSS.escape(getToCOptionId('desktop', cleanHash))}`)
      ?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <>
      <main class="flex-grow-1 container-fluid px-3 px-lg-4 mainPadding position-relative">
        <Show when={guideLoadStatus() === 'ready' && toc().length > 0}>
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
                <ToC idPrefix="mobile" toc={toc()} updateActiveTitle={updateActiveTitle} sticky={false} />
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
            <Match when={guideLoadStatus() === 'ready' && toc().length === 0}>
              <div class="w-100 py-5">
                <NoData>
                  <div class="fs-5">This guide has no content yet.</div>
                </NoData>
              </div>
            </Match>
            <Match when={guideLoadStatus() === 'ready'}>
              <div ref={setDesktopToC} class="d-none d-lg-flex">
                <ToC idPrefix="desktop" toc={toc()} updateActiveTitle={updateActiveTitle} sticky />
              </div>
              <div class="py-3 px-0 p-lg-4 pe-lg-0">
                <div class={`position-relative ${styles.guide}`}>
                  <For each={guide()!.categories}>
                    {(cat, index) => {
                      const id = getAnchorId({ title: cat.category }, guide());
                      const hasSubcategories = !isUndefined(cat.subcategories) && cat.subcategories.length > 0;

                      return (
                        <>
                          <div
                            id={isUndefined(id) ? undefined : `section_${id}`}
                            class={styles.section}
                            classList={{ [styles.catSection]: !hasSubcategories }}
                          >
                            <h1 class="border-bottom mb-3 mb-lg-4 pb-2" classList={{ 'mt-4 mt-lg-5': index() !== 0 }}>
                              {cat.category}
                            </h1>
                            <Show when={!isUndefined(cat.content)}>
                              {/* eslint-disable-next-line solid/no-innerhtml -- the guide content is markdown rendered to HTML by the build */}
                              <div innerHTML={cat.content} />
                            </Show>
                          </div>
                          <Show when={hasSubcategories}>
                            <For each={cat.subcategories}>
                              {(subcat, index) => {
                                const id = getAnchorId(
                                  { title: cat.category, subtitle: subcat.subcategory, grouped: true },
                                  guide()
                                );

                                return (
                                  <div
                                    id={isUndefined(id) ? undefined : `section_${id}`}
                                    class={styles.section}
                                    classList={{
                                      [styles.catSection]: index() === (cat.subcategories?.length ?? 0) - 1,
                                    }}
                                  >
                                    <h2 class="mt-4 mt-lg-5 mb-3 mb-lg-4 pb-2 border-bottom">{subcat.subcategory}</h2>
                                    {/* eslint-disable-next-line solid/no-innerhtml -- the guide content is markdown rendered to HTML by the build */}
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
