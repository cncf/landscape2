import { useWindowScrollPosition } from '@solid-primitives/scroll';
import { A, useLocation } from '@solidjs/router';
import { ExternalLink, Image, SVGIcon, SVGIconKind, useBreakpointDetect } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, Show } from 'solid-js';

import { EXPLORE_PATH, SCREENSHOTS_PATH, SMALL_DEVICES_BREAKPOINTS, STATS_PATH } from '../../data';
import scrollToTop from '../../utils/scrollToTop';
import DownloadDropdown from '../common/DownloadDropdown';
import Searchbar from '../common/Searchbar';
import { useSetMobileTOCStatus } from '../stores/mobileTOC';
import MobileDropdown from './MobileDropdown';
import styles from './MobileHeader.module.css';

const NAV_HEIGHT = 121;

interface Props {
  statsVisible: boolean;
}

const MobileHeader = (props: Props) => {
  const location = useLocation();
  const openMenu = useSetMobileTOCStatus();
  const logo = () => (window.baseDS.header ? window.baseDS.header!.logo : undefined);
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
        class={`d-flex d-lg-none flex-row align-items-center justify-content-between border-bottom shadow-sm px-2 w-100 ${styles.stickyNav}`}
        classList={{ 'opacity-0': !sticky(), [styles.isSticky]: sticky() }}
      >
        <div class="d-flex flex-row align-items-center">
          <Show when={location.pathname !== STATS_PATH}>
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
          <Show when={!isUndefined(logo())}>
            <button class="btn btn-link" onClick={() => scrollToTop(true)}>
              <Image logo={logo()!} class={styles.stickyLogo} name="Landscape logo" height={35} />
            </button>
          </Show>
        </div>
        <div>
          <MobileDropdown statsVisible={props.statsVisible} inSticky />
        </div>
      </div>
      <header class="d-block d-lg-none navbar navbar-expand p-0 mb-2 border-bottom shadow-sm">
        <div class="container-fluid d-flex flex-column flex-lg-row align-items-center p-3 p-lg-4 mainPadding">
          <div class={`d-flex flex-row justify-content-between align-items-center ${styles.logoWrapper}`}>
            <Show when={!isUndefined(logo())}>
              <A href={EXPLORE_PATH} class="me-4 me-xl-5">
                <Image class={styles.logo} logo={logo()!} name="Landscape logo" height={48} />
              </A>
            </Show>
            <div class="ms-auto d-flex d-lg-none">
              <MobileDropdown statsVisible={props.statsVisible} />
            </div>
          </div>

          <Show
            when={location.pathname !== SCREENSHOTS_PATH}
            fallback={
              <Show when={!isUndefined(window.baseDS.qr_code)}>
                <Image class={styles.qr} name="QR code" logo={window.baseDS.qr_code!} />
              </Show>
            }
          >
            <div class={`d-flex flex-row align-items-center mt-3 mt-md-4 ${styles.searchWrapper}`}>
              <div class="position-relative w-100">
                <Searchbar />
              </div>
              <div class="d-none d-lg-flex align-items-center">
                <DownloadDropdown />
                <Show
                  when={
                    !isUndefined(window.baseDS.header) &&
                    !isUndefined(window.baseDS.header!.links) &&
                    !isUndefined(window.baseDS.header!.links!.github)
                  }
                >
                  <ExternalLink class="btn btn-md text-dark fs-5 ms-2 px-0" href={window.baseDS.header!.links!.github!}>
                    <SVGIcon kind={SVGIconKind.GitHub} class={`position-relative ${styles.githubIcon}`} />
                  </ExternalLink>
                </Show>
              </div>
            </div>
          </Show>
        </div>
      </header>
    </>
  );
};

export default MobileHeader;
