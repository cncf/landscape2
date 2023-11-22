import { createScrollPosition } from '@solid-primitives/scroll';
import { A, useLocation, useNavigate } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';

import { BaseItem, SVGIconKind } from '../../types';
import scrollToTop from '../../utils/scrollToTop';
import DownloadDropdown from '../common/DownloadDropdown';
import ExternalLink from '../common/ExternalLink';
import Searchbar from '../common/Searchbar';
import SVGIcon from '../common/SVGIcon';
import styles from './Header.module.css';

interface Props {
  logo: string;
  items: BaseItem[];
}

const Header = (props: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const target = document.getElementById('landscape');
  const scroll = createScrollPosition(target as Element);
  const y = () => scroll.y;

  return (
    <header class={`d-none d-lg-flex navbar navbar-expand mb-2 border-bottom shadow-sm top-0 ${styles.navbar}`}>
      <div class="container-fluid d-flex flex-row align-items-center px-3 px-lg-4 mainPadding">
        <div class={`d-flex flex-row justify-content-between align-items-center ${styles.logoWrapper}`}>
          <button
            class="btn btn-link p-0 me-4 me-xl-5"
            onClick={() => {
              if (y() > 0) {
                scrollToTop(false);
              } else {
                navigate('/', {
                  replace: false,
                  scroll: false,
                });
              }
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
            <A
              class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
              activeClass="activeLink"
              href="/"
              state={{ from: 'header' }}
              end
            >
              Explore
            </A>

            <Show when={!isUndefined(window.baseDS.guide_summary) && !isEmpty(window.baseDS.guide_summary)}>
              <A
                class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
                href="/guide"
                activeClass="activeLink"
                state={{ from: 'header' }}
              >
                Guide
              </A>
            </Show>

            <A
              class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
              activeClass="activeLink"
              href="/stats"
              state={{ from: 'header' }}
            >
              Stats
            </A>
          </div>

          <div class={`d-flex flex-row align-items-center ms-auto mt-0 ${styles.searchWrapper}`}>
            <div class="position-relative me-4 w-100">
              <Searchbar items={props.items} searchBarClass={`${styles.searchBar}`} />
            </div>
            <div class="d-flex align-items-center">
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
