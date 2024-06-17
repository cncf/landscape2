import { useLocation, useNavigate } from '@solidjs/router';
import { ExternalLink, Image, SVGIcon, SVGIconKind } from 'common';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createMemo, Show } from 'solid-js';

import {
  ALL_OPTION,
  DEFAULT_VIEW_MODE,
  EXPLORE_PATH,
  GAMES_PATH,
  GUIDE_PATH,
  SCREENSHOTS_PATH,
  STATS_PATH,
} from '../../data';
import isExploreSection from '../../utils/isExploreSection';
import itemsDataGetter from '../../utils/itemsDataGetter';
import prepareLink from '../../utils/prepareLink';
import scrollToTop from '../../utils/scrollToTop';
import DownloadDropdown from '../common/DownloadDropdown';
import Searchbar from '../common/Searchbar';
import { useSetGroupActive } from '../stores/groupActive';
import { useSetViewMode } from '../stores/viewMode';
import EmbedModal from './EmbedModal';
import styles from './Header.module.css';

interface Props {
  statsVisible: boolean;
}

const Header = (props: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const logo = () => (window.baseDS.header ? window.baseDS.header!.logo : undefined);
  const setViewMode = useSetViewMode();
  const setSelectedGroup = useSetGroupActive();
  const isExploreActive = createMemo(() => isExploreSection(location.pathname));

  const isActive = (path: string) => {
    return path === location.pathname;
  };

  const resetDefaultExploreValues = () => {
    const groups = itemsDataGetter.getGroups();
    setViewMode(DEFAULT_VIEW_MODE);
    setSelectedGroup(!isUndefined(groups) ? groups[0] : ALL_OPTION);
  };

  return (
    <header class={`d-none d-lg-flex navbar navbar-expand mb-2 border-bottom shadow-sm ${styles.navbar}`}>
      <div class="container-fluid d-flex flex-row align-items-center px-3 px-lg-4 mainPadding">
        <Show when={!isUndefined(logo())}>
          <div class={`d-flex flex-row justify-content-between align-items-center me-3 ${styles.logoWrapper}`}>
            <button
              class="btn btn-link p-0 pe-3 me-2 me-xl-5"
              onClick={() => {
                resetDefaultExploreValues();
                navigate(prepareLink(EXPLORE_PATH), {
                  state: { from: 'logo-header' },
                });
                scrollToTop(false);
              }}
            >
              <Image class={styles.logo} logo={logo()!} name="Landscape logo" height={48} />
            </button>
          </div>
        </Show>

        <Show
          when={location.pathname !== SCREENSHOTS_PATH}
          fallback={
            <Show when={!isUndefined(window.baseDS.qr_code)}>
              <Image class={styles.qr} logo={window.baseDS.qr_code!} name="QR code" />
            </Show>
          }
        >
          <div class="d-flex align-items-center">
            <button
              class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
              classList={{ activeLink: isExploreActive() }}
              onClick={() => {
                if (isExploreActive()) {
                  scrollToTop(false);
                } else {
                  resetDefaultExploreValues();
                  navigate(prepareLink(EXPLORE_PATH), {
                    state: { from: 'header' },
                  });
                  scrollToTop(false);
                }
              }}
            >
              Explore
            </button>

            <Show when={!isUndefined(window.baseDS.guide_summary) && !isEmpty(window.baseDS.guide_summary)}>
              <button
                class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
                classList={{ activeLink: isActive(GUIDE_PATH) }}
                onClick={() => {
                  if (isActive(GUIDE_PATH)) {
                    scrollToTop(false);
                  } else {
                    navigate(prepareLink(GUIDE_PATH), {
                      state: { from: 'header' },
                    });
                    scrollToTop(false);
                  }
                }}
              >
                Guide
              </button>
            </Show>

            <Show when={props.statsVisible}>
              <button
                class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
                classList={{ activeLink: isActive(STATS_PATH) }}
                onClick={() => {
                  if (isActive(STATS_PATH)) {
                    scrollToTop(false);
                  } else {
                    navigate(prepareLink(STATS_PATH), {
                      state: { from: 'header' },
                    });
                    scrollToTop(false);
                  }
                }}
              >
                Stats
              </button>
            </Show>
          </div>

          <div class={`d-flex flex-row align-items-center ms-auto mt-0 ${styles.searchWrapper}`}>
            <div class="position-relative me-4 w-100">
              <Searchbar searchBarClass={`${styles.searchBar}`} />
            </div>

            <div class={`d-flex align-items-center ${styles.icons}`}>
              <EmbedModal />
              <DownloadDropdown />
              <Show when={!isUndefined(window.baseDS.games_available)}>
                <button
                  class={`btn btn-md text-dark ms-3 px-0 ${styles.btnLink}`}
                  onClick={() => {
                    navigate(prepareLink(GAMES_PATH), {
                      state: { from: 'header' },
                    });
                    scrollToTop(false);
                  }}
                >
                  <SVGIcon kind={SVGIconKind.Games} class={`position-relative ${styles.linkIcon}`} />
                </button>
              </Show>
              <Show
                when={
                  !isUndefined(window.baseDS.header) &&
                  !isUndefined(window.baseDS.header!.links) &&
                  !isUndefined(window.baseDS.header!.links!.github)
                }
              >
                <ExternalLink
                  class={`btn btn-md text-dark ms-3 px-0 ${styles.btnLink}`}
                  href={window.baseDS.header!.links!.github!}
                >
                  <SVGIcon kind={SVGIconKind.GitHub} class={`position-relative ${styles.linkIcon}`} />
                </ExternalLink>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </header>
  );
};

export default Header;
