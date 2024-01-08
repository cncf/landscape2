import { useWindowScrollPosition } from '@solid-primitives/scroll';
import { A, useLocation } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, Show } from 'solid-js';

import { SMALL_DEVICES_BREAKPOINTS } from '../../data';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import { SVGIconKind } from '../../types';
import scrollToTop from '../../utils/scrollToTop';
import DownloadDropdown from '../common/DownloadDropdown';
import ExternalLink from '../common/ExternalLink';
import Searchbar from '../common/Searchbar';
import SVGIcon from '../common/SVGIcon';
import { useSetMobileTOCStatus } from '../stores/mobileTOC';
import MobileDropdown from './MobileDropdown';
import styles from './MobileHeader.module.css';

const NAV_HEIGHT = 121;

const MobileHeader = () => {
  const location = useLocation();
  const openMenu = useSetMobileTOCStatus();
  const logo = () => window.baseDS.images.header_logo;
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
    <>
      <div
        class={`d-flex flex-row align-items-center justify-content-between border-bottom shadow-sm px-2 w-100 ${styles.stickyNav}`}
        classList={{ 'opacity-0': !sticky(), [styles.isSticky]: sticky() }}
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
              src={import.meta.env.MODE === 'development' ? `../../static/${logo()}` : `${logo()}`}
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
      <header class="d-block d-lg-none navbar navbar-expand p-0 mb-2 border-bottom shadow-sm">
        <div class="container-fluid d-flex flex-column flex-lg-row align-items-center p-3 p-lg-4 mainPadding">
          <div class={`d-flex flex-row justify-content-between align-items-center ${styles.logoWrapper}`}>
            <A href="/" class="me-4 me-xl-5">
              <img
                class={styles.logo}
                src={import.meta.env.MODE === 'development' ? `../../static/${logo()}` : `${logo()}`}
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
            <div class={`d-flex flex-row align-items-center mt-3 mt-md-4 ${styles.searchWrapper}`}>
              <div class="position-relative w-100">
                <Searchbar />
              </div>
              <div class="d-none d-lg-flex align-items-center">
                <DownloadDropdown />
                <ExternalLink class="btn btn-md text-dark fs-5 ms-2 px-0" href="https://github.com/cncf/landscape2">
                  <SVGIcon kind={SVGIconKind.GitHub} class={`position-relative ${styles.githubIcon}`} />
                </ExternalLink>
              </div>
            </div>
          </Show>
        </div>
      </header>
    </>
  );
};

export default MobileHeader;
