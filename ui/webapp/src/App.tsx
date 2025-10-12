import { createWindowSize } from '@solid-primitives/resize-observer';
import { Route, Router, useNavigate } from '@solidjs/router';
import { Loading } from 'common';
import isUndefined from 'lodash/isUndefined';
import range from 'lodash/range';
import { batch, createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';

import styles from './App.module.css';
import {
  ACQUISITIONS_PATH,
  EMBED_SETUP_PATH,
  EXPLORE_PATH,
  FINANCES_PATH,
  FUNDING_PATH,
  GAMES_PATH,
  GUIDE_PATH,
  LOGOS_PREVIEW_PATH,
  PROJECTS_PATH,
  SCREENSHOTS_PATH,
  STATS_PATH,
} from './data';
import Layout from './layout';
import Explore from './layout/explore';
import Finances from './layout/finances';
import Games from './layout/games';
import Guide from './layout/guide';
import Logos from './layout/logos';
import NotFound from './layout/notFound';
import Projects from './layout/projects';
import Screenshots from './layout/screenshots';
import Stats from './layout/stats';
import { BaseData } from './types';
import itemsDataGetter from './utils/itemsDataGetter';
import overlayData from './utils/overlayData';
import updateAlphaInColor from './utils/updateAlphaInColor';

// Colors
let COLOR_1 = 'rgba(0, 107, 204, 1)';
let COLOR_1_HOVER = 'rgba(0, 107, 204, 0.75)';
let COLOR_2 = 'rgba(255, 0, 170, 1)';
let COLOR_3 = 'rgba(96, 149, 214, 1)';
let COLOR_4 = 'rgba(0, 42, 81, 0.7)';
let COLOR_5 = 'rgba(1, 107, 204, 0.7)';
let COLOR_6 = 'rgba(0, 42, 81, 0.7)';
let COLOR_7 = 'rgba(180, 219, 255, 1)';

const GroupAliasRedirect = (props: { target: string }) => {
  const navigate = useNavigate();
  onMount(() => {
    navigate(props.target, { replace: true });
  });
  return null;
};

const App = () => {
  const [isOverlay, setIsOverlay] = createSignal<boolean | undefined>();
  const [data, setData] = createSignal<BaseData>();
  const [loadingOverlay, setLoadingOverlay] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string | undefined>();
  const [motdDismissed, setMotdDismissed] = createSignal(false);
  const size = createWindowSize();
  const height = () => size.height;
  const motdContent = () => data()?.header?.motd;
  const motdVisible = createMemo(() => !isUndefined(motdContent()) && !motdDismissed());
  let motdRef: HTMLDivElement | undefined;
  const groupAliasRoutes = createMemo(() => {
    const groups = data()?.groups;
    if (isUndefined(groups)) return [];
    return groups.reduce<{ alias: string; normalized: string }[]>((aliasRoutes, group) => {
      const alias = group.alias?.trim();
      if (!alias) return aliasRoutes;
      const sanitizedAlias = alias.replace(/^\/+|\/+$/g, '');
      if (sanitizedAlias === '') return aliasRoutes;
      if (aliasRoutes.some((route) => route.alias === sanitizedAlias)) return aliasRoutes;
      aliasRoutes.push({ alias: sanitizedAlias, normalized: group.normalized_name });
      return aliasRoutes;
    }, []);
  });

  async function fetchOverlayData() {
    try {
      const data = await overlayData.getOverlayBaseData();
      if (data) {
        loadColors();
        setData(data);
      } else {
        setError('No data found.');
      }
    } catch (e) {
      setError(e as string);
    }
    setLoadingOverlay(false);
  }

  const updateAppHeight = () => {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  };

  const updateMotdHeight = () => {
    if (!motdVisible()) {
      document.documentElement.style.setProperty('--motd-height', '0px');
      return;
    }
    const elementHeight = motdRef?.offsetHeight ?? 0;
    document.documentElement.style.setProperty('--motd-height', `${elementHeight}px`);
  };

  const loadColors = () => {
    if (!isUndefined(window.baseDS) && !isUndefined(window.baseDS.colors)) {
      if (!isUndefined(window.baseDS.colors?.color1)) {
        COLOR_1 = window.baseDS.colors?.color1;
        COLOR_1_HOVER = updateAlphaInColor(COLOR_1, 0.75);
      }
      if (!isUndefined(window.baseDS.colors?.color2)) {
        COLOR_2 = window.baseDS.colors?.color2;
      }
      if (!isUndefined(window.baseDS.colors?.color3)) {
        COLOR_3 = window.baseDS.colors?.color3;
      }
      if (!isUndefined(window.baseDS.colors?.color4)) {
        COLOR_4 = window.baseDS.colors?.color4;
      }
      if (!isUndefined(window.baseDS.colors?.color5)) {
        COLOR_5 = window.baseDS.colors?.color5;
      }
      if (!isUndefined(window.baseDS.colors?.color6)) {
        COLOR_6 = window.baseDS.colors?.color6;
      }
      if (!isUndefined(window.baseDS.colors?.color7)) {
        COLOR_7 = window.baseDS.colors?.color7;
      }

      const colors = [COLOR_1, COLOR_2, COLOR_3, COLOR_4, COLOR_5, COLOR_6, COLOR_7];

      range(colors.length).forEach((i: number) => {
        document.documentElement.style.setProperty(`--color${i + 1}`, colors[i]);
      });
      document.documentElement.style.setProperty('--color1-hover', COLOR_1_HOVER);
    }
  };

  createEffect(
    on(isOverlay, () => {
      if (!isUndefined(isOverlay())) {
        if (!isOverlay()) {
          itemsDataGetter.init();
        } else {
          fetchOverlayData();
        }
      }
    })
  );

  createEffect(on(height, updateAppHeight));

  createEffect(
    on(motdContent, () => {
      setMotdDismissed(false);
    })
  );

  createEffect(() => {
    if (motdVisible()) {
      document.body.classList.add('motd-visible');
      requestAnimationFrame(() => {
        updateMotdHeight();
      });
    } else {
      document.body.classList.remove('motd-visible');
      document.documentElement.style.setProperty('--motd-height', '0px');
    }
  });

  createEffect(() => {
    if (!motdVisible() || !motdRef || typeof ResizeObserver === 'undefined') {
      return;
    }
    updateMotdHeight();
    const observer = new ResizeObserver(() => {
      updateMotdHeight();
    });
    observer.observe(motdRef);
    onCleanup(() => {
      observer.disconnect();
    });
  });

  onMount(() => {
    const isOverlayActive = overlayData.checkIfOverlayInQuery();
    if (!isOverlayActive) {
      itemsDataGetter.prepareGroups();
      setData(window.baseDS);
    } else {
      setLoadingOverlay(true);
    }

    batch(() => {
      updateAppHeight();
      setIsOverlay(isOverlayActive);
      loadColors();
    });

    if (window.Osano) {
      window.Osano.cm.addEventListener('osano-cm-initialized', () => {
        document.body.classList.add('osano-loaded');
      });
    }
  });

  return (
    <>
      {/* Overlay alert */}
      <Show when={isOverlay() && !isUndefined(error)}>
        <div class={`position-fixed top-0 start-0 end-0 ${styles.alertWrapper}`}>
          <div
            class={`alert alert-warning w-100 d-flex align-items-center justify-content-center rounded-0 m-0 px-3 py-0 lh-base text-uppercase fw-semibold ${styles.alert} ${styles.alertOverlay}`}
          >
            Landscape overlay enabled
          </div>
        </div>
      </Show>
      {/* motd */}
      <Show when={motdVisible() && !isUndefined(motdContent())}>
        <div
          class={`position-fixed start-0 end-0 ${styles.alertWrapper}`}
          style={{ top: isOverlay() ? 'var(--overlay-alert-height)' : '0px' }}
        >
          <div
            ref={motdRef}
            class={`alert w-100 d-flex align-items-center rounded-0 m-0 px-3 px-lg-4 py-2 lh-base ${styles.alert} ${styles.motd} ${styles.motdAlert}`}
          >
            {/* eslint-disable solid/no-innerhtml */}
            <div class={`flex-grow-1 text-center ${styles.motdMessage}`} innerHTML={motdContent()} />
            {/* eslint-enable solid/no-innerhtml */}
            <button
              type="button"
              class={`btn-close ${styles.motdClose}`}
              aria-label="Dismiss message"
              onClick={() => {
                setMotdDismissed(true);
              }}
            />
          </div>
        </div>
      </Show>
      <Show when={loadingOverlay()}>
        <Loading legend="Setting up landscape overlay..." legendClass={`fw-semibold ${styles.legend}`} />
      </Show>
      <Show when={!isUndefined(error())}>
        <div class="d-flex align-items-center justify-content-center w-100 h-100">
          <div class={`alert alert-danger py-4 px-5 rounded-0 d-flex flex-column ${styles.errorAlert}`} role="alert">
            <div class={`alert-heading text-center ${styles.errorAlertHeading}`}>
              Error setting up landscape overlay
            </div>
            <hr />
            <div class={`flex-grow-1 ${styles.preWrapper}`}>
              <code>
                <pre class={`overflow-auto p-2 border border-dark text-light font-monospace mb-0 h-100 ${styles.pre}`}>
                  {error()}
                </pre>
              </code>
            </div>
          </div>
        </div>
      </Show>
      <Show when={!isUndefined(data())}>
        <Router root={Layout}>
          <Route path={[EXPLORE_PATH, EMBED_SETUP_PATH]} component={() => <Explore initialData={data()!} />} />
          <Route path={GUIDE_PATH} component={Guide} />
          <Route path={STATS_PATH} component={Stats} />
          <Route path={GAMES_PATH} component={Games} />
          <Route path={FINANCES_PATH} component={Finances} />
          <Route path={FUNDING_PATH} component={Finances} />
          <Route path={ACQUISITIONS_PATH} component={Finances} />
          <Route path={PROJECTS_PATH} component={Projects} />
          <Route path={LOGOS_PREVIEW_PATH} component={Logos} />
          <For each={groupAliasRoutes()}>
            {(route) => (
              <Route
                path={`${EXPLORE_PATH}${route.alias}`}
                component={() => (
                  <GroupAliasRedirect target={`${EXPLORE_PATH}?group=${encodeURIComponent(route.normalized)}`} />
                )}
              />
            )}
          </For>
          <Route path="*" component={NotFound} />
          <Route path={SCREENSHOTS_PATH} component={() => <Screenshots initialData={data()!} />} />
        </Router>
      </Show>
    </>
  );
};

export default App;
