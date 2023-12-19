import { useLocation, useNavigate } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';

import { BaseItem, SVGIconKind, ViewMode } from '../../types';
import scrollToTop from '../../utils/scrollToTop';
import DownloadDropdown from '../common/DownloadDropdown';
import ExternalLink from '../common/ExternalLink';
import Searchbar from '../common/Searchbar';
import SVGIcon from '../common/SVGIcon';
import { useSetGroupActive } from '../stores/groupActive';
import { useSetViewMode } from '../stores/viewMode';
import EmbedModal from './EmbedModal';
import styles from './Header.module.css';

interface Props {
  logo: string;
  items: BaseItem[];
}

const Header = (props: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const setViewMode = useSetViewMode();
  const setSelectedGroup = useSetGroupActive();

  const isActive = (path: string) => {
    return path === location.pathname;
  };

  return (
    <header class={`d-none d-lg-flex navbar navbar-expand mb-2 border-bottom shadow-sm top-0 ${styles.navbar}`}>
      <div class="container-fluid d-flex flex-row align-items-center px-3 px-lg-4 mainPadding">
        <div class={`d-flex flex-row justify-content-between align-items-center ${styles.logoWrapper}`}>
          <button
            class="btn btn-link p-0 me-3 me-xl-5"
            onClick={() => {
              const groups = window.baseDS.groups;
              setViewMode(ViewMode.Grid);
              setSelectedGroup(!isUndefined(groups) ? groups[0].normalized_name : 'default');
              navigate('/');
            }}
          >
            <img
              class={`${styles.logo}`}
              src={import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `${props.logo}`}
              alt="Landscape logo"
              width="auto"
              height={48}
            />
          </button>
        </div>

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
                  navigate('/', {
                    state: { from: 'header' },
                  });
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
                }
              }}
            >
              Stats
            </button>
          </div>

          <div class={`d-flex flex-row align-items-center ms-auto mt-0 ${styles.searchWrapper}`}>
            <div class="position-relative me-4 w-100">
              <Searchbar items={props.items} searchBarClass={`${styles.searchBar}`} />
            </div>

            <div class={`d-flex align-items-center ${styles.icons}`}>
              <EmbedModal />
              <DownloadDropdown />
              <ExternalLink
                class={`btn btn-md text-dark ms-2 ms-xl-3 px-0 ${styles.btnLink}`}
                href="https://github.com/cncf/landscape2"
              >
                <SVGIcon kind={SVGIconKind.GitHub} class={`position-relative ${styles.githubIcon}`} />
              </ExternalLink>
            </div>
          </div>
        </Show>
      </div>
    </header>
  );
};

export default Header;
