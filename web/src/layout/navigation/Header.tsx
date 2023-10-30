import { useWindowScrollPosition } from '@solid-primitives/scroll';
import { A, useLocation } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, Show } from 'solid-js';

import { SMALL_DEVICES_BREAKPOINTS } from '../../data';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import { BaseItem, SVGIconKind } from '../../types';
import scrollToTop from '../../utils/scrollToTop';
import DownloadDropdown from '../common/DownloadDropdown';
import ExternalLink from '../common/ExternalLink';
import Searchbar from '../common/Searchbar';
import SVGIcon from '../common/SVGIcon';
import { useSetMobileTOCStatus } from '../stores/mobileTOC';
import styles from './Header.module.css';
import MobileDropdown from './MobileDropdown';

interface Props {
  logo: string;
  items: BaseItem[];
}

const NAV_HEIGHT = 130;

const Header = (props: Props) => {
  const location = useLocation();
  const openMenu = useSetMobileTOCStatus();
  const { point } = useBreakpointDetect();
  const [sticky, setSticky] = createSignal<boolean>(false);
  const scroll = useWindowScrollPosition();
  const y = () => scroll.y;

  createEffect(
    on(y, () => {
      if (!isUndefined(point()) && SMALL_DEVICES_BREAKPOINTS.includes(point()!)) {
        setSticky(y() > NAV_HEIGHT);
      }
    })
  );

  return (
    <header class="navbar navbar-expand border-bottom p-0 shadow-sm mb-2" classList={{ 'sticky-top': sticky() }}>
      <div
        class="container-fluid d-flex flex-column flex-lg-row align-items-center p-3 p-lg-4 mainPadding"
        classList={{ 'd-none': sticky() }}
      >
        <div class={`d-flex flex-row justify-content-between align-items-center ${styles.logoWrapper}`}>
          <A href="/" class="me-4 me-xl-5">
            <img
              class={styles.logo}
              src={import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `${props.logo}`}
              alt="Landscape logo"
              width="auto"
              height={48}
            />
          </A>
          <div class="d-flex d-lg-none">
            <MobileDropdown />
          </div>
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
          <div class="d-none d-lg-flex align-items-center">
            <A
              class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
              activeClass="activeLink"
              href="/"
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
            >
              Stats
            </A>
          </div>

          <div class={`d-flex flex-row align-items-center ms-lg-auto mt-3 mt-md-4 mt-lg-0 ${styles.searchWrapper}`}>
            <div class="position-relative me-0 me-lg-4 w-100">
              <Searchbar items={props.items} />
            </div>
            <div class="d-none d-lg-flex align-items-center">
              <DownloadDropdown />
              <ExternalLink
                class="btn btn-md text-dark fs-5 ms-2 ms-xl-4 px-0"
                href="https://github.com/cncf/landscape2"
              >
                <SVGIcon kind={SVGIconKind.GitHub} class={`position-relative ${styles.githubIcon}`} />
              </ExternalLink>
            </div>
          </div>
        </Show>
      </div>
      <div
        class={`d-flex d-lg-none flex-row align-items-center justify-content-between px-2 w-100 ${styles.stickyNav}`}
        classList={{ 'd-none': !sticky() }}
      >
        <div class="d-flex flex-row align-items-center">
          <Show when={location.pathname !== '/stats'}>
            <button
              title="Index"
              class={`position-relative btn btn-sm btn-secondary text-white btn-sm rounded-0 p-0 ${styles.mobileBtn}`}
              onClick={() => openMenu(true)}
            >
              <SVGIcon kind={SVGIconKind.ToC} />
            </button>
          </Show>
        </div>
        <div>
          <button class="btn btn-link" onClick={() => scrollToTop(true)}>
            <img
              src={import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `${props.logo}`}
              class={styles.stickyLogo}
              alt="Landscape logo"
              width="auto"
              height={35}
            />
          </button>
        </div>
        <div>
          <MobileDropdown inSticky />
        </div>
      </div>
    </header>
  );
};

export default Header;
