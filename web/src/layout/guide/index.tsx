import { useLocation, useNavigate } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, For, on, onMount, Show } from 'solid-js';

import { SMALL_DEVICES_BREAKPOINTS } from '../../data';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import { CategoryGuide, Guide, StateContent, SubcategoryGuide, SVGIconKind, ToCTitle } from '../../types';
import getNormalizedName from '../../utils/getNormalizedName';
import goToElement from '../../utils/goToElement';
import isElementInView from '../../utils/isElementInView';
import scrollToTop from '../../utils/scrollToTop';
import Loading from '../common/Loading';
import { Sidebar } from '../common/Sidebar';
import SVGIcon from '../common/SVGIcon';
import Footer from '../navigation/Footer';
import { useGuideFileContent, useGuideTOC, useSetGuideFileContent, useSetGuideTOC } from '../stores/guideFile';
import { useMobileTOCStatus, useSetMobileTOCStatus } from '../stores/mobileTOC';
import styles from './Guide.module.css';
import SubcategoryExtended from './SubcategoryExtended';
import ToC from './ToC';

const GuideIndex = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const guideContent = useGuideFileContent();
  const setGuideContent = useSetGuideFileContent();
  const [guide, setGuide] = createSignal<Guide | null>();
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
            id: getNormalizedName({ cat: cat.category, subcat: subcat.subcategory, grouped: true }),
          });
        });
      }

      content.push({
        title: cat.category,
        id: getNormalizedName({ cat: cat.category }),
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

  onMount(() => {
    async function fetchGuide() {
      try {
        fetch(import.meta.env.MODE === 'development' ? '../../static/data/guide.json' : './data/guide.json')
          .then((res) => res.json())
          .then((data) => {
            setGuide(data);
            prepareToC(data);
            setGuideContent(data);
          });
      } catch {
        setGuide(null);
      }
    }

    if (isUndefined(guideContent())) {
      fetchGuide();
    } else {
      setTimeout(() => {
        setFirstItem(guideToc()![0].id);
        setGuide(guideContent());
        setToc(guideToc());
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
              goToElement(
                !isUndefined(point()) && SMALL_DEVICES_BREAKPOINTS.includes(point()!),
                `section_${cleanHash}`,
                16
              );
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
    navigate(`${location.pathname}${location.search}#${title}`, {
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
          goToElement(onSmallDevice, `section_${title}`, 16);
        }, 50);
      } else {
        goToElement(onSmallDevice, `section_${title}`, 16);
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
              <Show when={!isUndefined(guide())} fallback={<Loading />}>
                <ToC toc={toc()} updateActiveTitle={updateActiveTitle} sticky={false} />
              </Show>
            </div>
          </Sidebar>
        </div>
        <div class="d-flex flex-row" classList={{ [styles.loadingContent]: isUndefined(guide()) }}>
          <Show when={!isUndefined(guide())} fallback={<Loading spinnerClass="position-fixed top-50 start-50" />}>
            <div class="d-none d-lg-flex">
              <ToC toc={toc()} updateActiveTitle={updateActiveTitle} sticky />
            </div>
            <div class="py-3 px-0 p-lg-4 pe-lg-0">
              <div class={`position-relative ${styles.guide}`}>
                <For each={guide()!.categories}>
                  {(cat, index) => {
                    const id = getNormalizedName({ cat: cat.category });
                    const hasSubcategories = !isUndefined(cat.subcategories) && cat.subcategories.length > 0;

                    return (
                      <>
                        <div id={`section_${id}`} classList={{ [styles.catSection]: !hasSubcategories }}>
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
                              const id = getNormalizedName({
                                cat: cat.category,
                                subcat: subcat.subcategory,
                                grouped: true,
                              });

                              return (
                                <div
                                  id={`section_${id}`}
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
