import { useLocation, useNavigate } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';

import { ALL_OPTION } from '../../data';
import { SVGIconKind, ViewMode } from '../../types';
import scrollToTop from '../../utils/scrollToTop';
import DownloadDropdown from '../common/DownloadDropdown';
import ExternalLink from '../common/ExternalLink';
import Searchbar from '../common/Searchbar';
import SVGIcon from '../common/SVGIcon';
import { useSetGroupActive } from '../stores/groupActive';
import { useSetViewMode } from '../stores/viewMode';
import EmbedModal from './EmbedModal';
import styles from './Header.module.css';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const logo = () => (window.baseDS.header ? window.baseDS.header!.logo : undefined);
  const setViewMode = useSetViewMode();
  const setSelectedGroup = useSetGroupActive();

  const isActive = (path: string) => {
    return path === location.pathname;
  };

  const resetDefaultExploreValues = () => {
    const groups = window.baseDS.groups;
    setViewMode(ViewMode.Grid);
    setSelectedGroup(!isUndefined(groups) ? groups[0].normalized_name : ALL_OPTION);
  };

  return (
    <header class={`d-none d-lg-flex navbar navbar-expand mb-2 border-bottom shadow-sm top-0 ${styles.navbar}`}>
      <div class="container-fluid d-flex flex-row align-items-center px-3 px-lg-4 mainPadding">
        <Show when={!isUndefined(logo())}>
          <div class={`d-flex flex-row justify-content-between align-items-center me-3 ${styles.logoWrapper}`}>
            <button
              class="btn btn-link p-0 pe-3 me-2 me-xl-5"
              onClick={() => {
                resetDefaultExploreValues();
                navigate('/', {
                  state: { from: 'logo-header' },
                });
                scrollToTop(false);
              }}
            >
              <img
                class={`${styles.logo}`}
                src={import.meta.env.MODE === 'development' ? `../../static/${logo()}` : `${logo()}`}
                alt="Landscape logo"
                width="auto"
                height={48}
              />
            </button>
          </div>
        </Show>

        <Show
          when={location.pathname !== '/screenshot'}
          fallback={
            <Show when={!isUndefined(window.baseDS.qr_code)}>
              <img
                class={styles.qr}
                alt="QR code"
                src={
                  import.meta.env.MODE === 'development'
                    ? `../../static/${window.baseDS.qr_code}`
                    : window.baseDS.qr_code
                }
              />
            </Show>
          }
        >
          <div class="d-flex align-items-center">
            <button
              class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
              classList={{ activeLink: isActive('/') }}
              onClick={() => {
                if (isActive('/')) {
                  scrollToTop(false);
                } else {
                  resetDefaultExploreValues();
                  navigate('/', {
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
                classList={{ activeLink: isActive('/guide') }}
                onClick={() => {
                  if (isActive('/guide')) {
                    scrollToTop(false);
                  } else {
                    navigate('/guide', {
                      state: { from: 'header' },
                    });
                    scrollToTop(false);
                  }
                }}
              >
                Guide
              </button>
            </Show>

            <button
              class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
              classList={{ activeLink: isActive('/stats') }}
              onClick={() => {
                if (isActive('/stats')) {
                  scrollToTop(false);
                } else {
                  navigate('/stats', {
                    state: { from: 'header' },
                  });
                  scrollToTop(false);
                }
              }}
            >
              Stats
            </button>
          </div>

          <div class={`d-flex flex-row align-items-center ms-auto mt-0 ${styles.searchWrapper}`}>
            <div class="position-relative me-4 w-100">
              <Searchbar searchBarClass={`${styles.searchBar}`} />
            </div>

            <div class={`d-flex align-items-center ${styles.icons}`}>
              <EmbedModal />
              <DownloadDropdown />
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
                  <SVGIcon kind={SVGIconKind.GitHub} class={`position-relative ${styles.githubIcon}`} />
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
