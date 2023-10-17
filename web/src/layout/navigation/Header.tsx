import { A, useLocation } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';

import { BaseItem, SVGIconKind } from '../../types';
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

  return (
    <header class="navbar navbar-expand border-bottom p-0 shadow-sm mb-2">
      <div class="container-fluid d-flex align-items-center p-4">
        <div class="mx-auto mx-md-0">
          <A href="/" class="me-5">
            <img
              class={styles.logo}
              src={import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `${props.logo}`}
              alt="Landscape logo"
            />
          </A>
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
          <div class="d-none d-md-flex align-items-center">
            <A
              class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
              activeClass="activeLink"
              href="/"
              end
            >
              Explore
            </A>

            {!isUndefined(window.baseDS.guide_summary) && !isEmpty(window.baseDS.guide_summary) && (
              <A
                class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
                href="/guide"
                activeClass="activeLink"
                state={{ from: 'header' }}
              >
                Guide
              </A>
            )}

            <A
              class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
              activeClass="activeLink"
              href="/stats"
            >
              Stats
            </A>
          </div>

          <div class={`d-none d-md-flex flex-row align-items-center ms-auto ${styles.searchWrapper}`}>
            <div class="d-none d-lg-block position-relative me-2 me-xl-4">
              <Searchbar items={props.items} />
            </div>
            <DownloadDropdown />
            <ExternalLink class="btn btn-md text-dark fs-5 ms-2 ms-xl-4 px-0" href="https://github.com/cncf/landscape2">
              <SVGIcon kind={SVGIconKind.GitHub} class={`position-relative ${styles.githubIcon}`} />
            </ExternalLink>
          </div>
        </Show>
      </div>
    </header>
  );
};

export default Header;
