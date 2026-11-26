import { createWindowSize } from '@solid-primitives/resize-observer';
import { Route, Router, useLocation, useNavigate } from '@solidjs/router';
import { Loading } from 'common';
import { applyColors } from 'common/utils';
import isUndefined from 'lodash/isUndefined';
import { batch, createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';

import styles from './App.module.css';
import {
  ACQUISITIONS_PATH,
  EMBED_SETUP_PATH,
  EXPLORE_PATH,
  FINANCES_PATH,
  FUNDING_PATH,
  GAMES_PATH,
  GROUP_PARAM,
  GUIDE_PATH,
  LOGOS_PREVIEW_PATH,
  PROJECTS_PATH,
  SCREENSHOTS_PATH,
  STATS_PATH,
  SUMMARY_PATH,
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
import { getGroupAliasRoutes } from './utils/groupAlias';
import itemsDataGetter from './utils/itemsDataGetter';
import overlayData from './utils/overlayData';
import trackKeyboardNavigation from './utils/trackKeyboardNavigation';
import { buildPath, withParams } from './utils/urlParams';

/** Redirects a group alias path to Explore with that group, keeping the other params and the hash. */
const GroupAliasRedirect = (props: { normalized: string }) => {
  const location = useLocation();
  const navigate = useNavigate();
  onMount(() => {
    navigate(buildPath(EXPLORE_PATH, withParams(location.search, { [GROUP_PARAM]: props.normalized }), location.hash), {
      replace: true,
    });
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
  const [motdRef, setMotdRef] = createSignal<HTMLDivElement>();
  const groupAliasRoutes = createMemo(() => getGroupAliasRoutes(data()?.groups));

  async function fetchOverlayData() {
    try {
      const data = await overlayData.getOverlayBaseData();
      if (data) {
        applyColors(window.baseDS.colors);
        setData(data);
      } else {
        setError('No data found.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoadingOverlay(false);
  }

  const updateAppHeight = () => {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  };

  const setMotdHeight = (height: number) => {
    document.documentElement.style.setProperty('--motd-height', `${height}px`);
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
    document.body.classList.toggle('motd-visible', motdVisible());
  });

  // The motd height follows the size of its element while it is visible
  createEffect(() => {
    const element = motdRef();
    if (!motdVisible() || isUndefined(element)) {
      setMotdHeight(0);
      return;
    }
    setMotdHeight(element.offsetHeight);
    const observer = new ResizeObserver(() => {
      setMotdHeight(element.offsetHeight);
    });
    observer.observe(element);
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
    });
    applyColors(window.baseDS.colors);

    window.Osano?.cm.addEventListener('osano-cm-initialized', () => {
      document.body.classList.add('osano-loaded');
    });

    onCleanup(trackKeyboardNavigation());
  });

  return (
    <>
      {/* Overlay alert */}
      <Show when={isOverlay()}>
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
            ref={setMotdRef}
            class={`alert w-100 d-flex align-items-center rounded-0 m-0 px-3 px-lg-4 py-2 lh-base ${styles.alert} ${styles.motd} ${styles.motdAlert}`}
          >
            {/* eslint-disable-next-line solid/no-innerhtml -- the motd is markdown rendered to HTML by the build */}
            <div class={`flex-grow-1 text-center ${styles.motdMessage}`} innerHTML={motdContent()} />
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
          <Route path={[PROJECTS_PATH, SUMMARY_PATH]} component={Projects} />
          <Route path={LOGOS_PREVIEW_PATH} component={Logos} />
          <For each={groupAliasRoutes()}>
            {(route) => (
              <Route
                path={`${EXPLORE_PATH}${route.alias}`}
                component={() => <GroupAliasRedirect normalized={route.normalized} />}
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
