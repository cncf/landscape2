import { A, useLocation } from '@solidjs/router';
import { ExternalLink, Image, SVGIcon, SVGIconKind } from 'common';
import isUndefined from 'lodash/isUndefined';
import { For, Show } from 'solid-js';

import { EXPLORE_PATH, GAMES_PATH, SCREENSHOTS_PATH } from '../../data';
import { StateContent } from '../../types';
import prepareLink from '../../utils/prepareLink';
import scrollToTop from '../../utils/scrollToTop';
import DownloadDropdown from '../common/DownloadDropdown';
import Searchbar from '../common/Searchbar';
import EmbedModal from './EmbedModal';
import styles from './Header.module.css';
import { getDefaultExploreQuery, isNavLinkActive, NAV_LINKS } from './navLinks';

/** History state of the entries pushed from the header links. */
const NAV_STATE: StateContent = { from: 'header' };

interface Props {
  statsVisible: boolean;
}

const Header = (props: Props) => {
  const location = useLocation();
  const logo = () => (window.baseDS.header ? window.baseDS.header!.logo : undefined);
  const textLinks = () => NAV_LINKS.filter((link) => link.path !== GAMES_PATH && link.isVisible(props.statsVisible));
  const gamesLink = () => NAV_LINKS.find((link) => link.path === GAMES_PATH && link.isVisible(props.statsVisible));

  return (
    <header class={`d-none d-lg-flex navbar navbar-expand mb-2 border-bottom shadow-sm ${styles.navbar}`}>
      <div class="container-fluid d-flex flex-row align-items-center px-3 px-lg-4 mainPadding">
        <Show when={!isUndefined(logo())}>
          <div class="d-flex flex-row justify-content-between align-items-center me-3">
            <A
              class="btn btn-link p-0 pe-3 me-2 me-xl-5"
              activeClass=""
              inactiveClass=""
              href={prepareLink(EXPLORE_PATH, getDefaultExploreQuery())}
              state={NAV_STATE}
              onClick={() => scrollToTop(false)}
              aria-label='Go to "Explore" page'
            >
              <Image class={styles.logo} logo={logo()!} name="Landscape" height={48} />
            </A>
          </div>
        </Show>

        <Show
          when={location.pathname !== SCREENSHOTS_PATH}
          fallback={
            <Show when={!isUndefined(window.baseDS.qr_code)}>
              <Image class={styles.qr} logo={window.baseDS.qr_code!} alt="QR code" />
            </Show>
          }
        >
          <nav class="d-flex align-items-center" aria-label="Main">
            <For each={textLinks()}>
              {(link) => (
                <A
                  class={`btn btn-link position-relative text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
                  classList={{ activeLink: isNavLinkActive(link, location.pathname) }}
                  activeClass=""
                  inactiveClass=""
                  href={prepareLink(link.path, link.query?.())}
                  state={NAV_STATE}
                  onClick={() => scrollToTop(false)}
                  // The router only sets `aria-current` on an exact path match and falls back to this one otherwise
                  aria-current={isNavLinkActive(link, location.pathname) ? 'page' : undefined}
                >
                  {link.label}
                </A>
              )}
            </For>
          </nav>

          <div class="d-flex flex-row align-items-center ms-auto mt-0">
            <div class="position-relative me-4 w-100">
              <Searchbar searchBarClass={styles.searchBar} device="desktop" />
            </div>

            <div class={`d-flex align-items-center ${styles.icons}`}>
              <EmbedModal />
              <DownloadDropdown />
              <Show when={gamesLink()}>
                {(link) => (
                  <A
                    class={`btn btn-md text-dark ms-3 px-0 ${styles.btnLink}`}
                    activeClass=""
                    inactiveClass=""
                    href={prepareLink(link().path, link().query?.())}
                    state={NAV_STATE}
                    onClick={() => scrollToTop(false)}
                    aria-label={link().label}
                  >
                    <SVGIcon kind={SVGIconKind.Games} class={`position-relative ${styles.linkIcon}`} />
                  </A>
                )}
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
                  label="GitHub repository"
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
