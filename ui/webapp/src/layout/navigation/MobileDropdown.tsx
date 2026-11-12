import { A, useLocation } from '@solidjs/router';
import { ExternalLink, SVGIcon, SVGIconKind, useOutsideClick } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, createUniqueId, For, onCleanup, Show } from 'solid-js';

import { StateContent } from '../../types';
import prepareLink from '../../utils/prepareLink';
import styles from './MobileDropdown.module.css';
import { isNavLinkActive, NAV_LINKS } from './navLinks';

/** History state of the entries pushed from the mobile navigation links. */
const NAV_STATE: StateContent = { from: 'mobileHeader' };

interface Props {
  statsVisible: boolean;
  inSticky?: boolean;
}

const MobileDropdown = (props: Props) => {
  const location = useLocation();
  const panelId = `mobile-nav-${createUniqueId()}`;
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [triggerRef, setTriggerRef] = createSignal<HTMLButtonElement>();
  const visibleLinks = () => NAV_LINKS.filter((link) => link.isVisible(props.statsVisible));
  useOutsideClick([ref], [], visibleDropdown, () => setVisibleDropdown(false));

  const closeDropdown = () => {
    setVisibleDropdown(false);
  };

  // Escape closes the open menu and returns the focus to its trigger
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDropdown();
      triggerRef()?.focus();
    }
  };

  createEffect(() => {
    if (visibleDropdown()) {
      document.addEventListener('keydown', onKeyDown);
      onCleanup(() => document.removeEventListener('keydown', onKeyDown));
    }
  });

  return (
    <div ref={setRef} class="ms-auto position-relative">
      <button
        ref={setTriggerRef}
        class={`btn btn-light btn-sm border-0 rounded-0 btnIconMobile ${styles.btn}`}
        classList={{ [styles.inSticky]: !isUndefined(props.inSticky) && props.inSticky }}
        type="button"
        onClick={() => setVisibleDropdown((prev) => !prev)}
        aria-label="Open navigation menu"
        aria-expanded={visibleDropdown()}
        aria-controls={panelId}
      >
        <div class="d-flex align-items-center justify-content-center h-100 w-100">
          <SVGIcon kind={SVGIconKind.ThreeBars} />
        </div>
      </button>

      <nav
        id={panelId}
        class={`dropdown-menu rounded-0 ${styles.dropdown}`}
        classList={{ show: visibleDropdown() }}
        hidden={!visibleDropdown()}
        aria-label="Main"
      >
        <div class={`d-block position-absolute ${styles.arrow}`} />
        <For each={visibleLinks()}>
          {(link, index) => (
            <div class="dropdown-item" classList={{ 'my-2': index() === 0, 'mb-2': index() > 0 }}>
              <A
                class={`btn btn-link position-relative text-uppercase w-100 text-start fw-semibold text-decoration-none p-0 ${styles.link}`}
                classList={{ activeLink: isNavLinkActive(link, location.pathname) }}
                activeClass=""
                inactiveClass=""
                href={prepareLink(link.path, link.query?.())}
                state={NAV_STATE}
                onClick={closeDropdown}
                // The router only sets `aria-current` on an exact path match and falls back to this one otherwise
                aria-current={isNavLinkActive(link, location.pathname) ? 'page' : undefined}
              >
                {link.label}
              </A>
            </div>
          )}
        </For>
        <Show
          when={
            !isUndefined(window.baseDS.header) &&
            !isUndefined(window.baseDS.header!.links) &&
            !isUndefined(window.baseDS.header!.links!.github)
          }
        >
          <hr />
          <div class="dropdown-item mb-2">
            <ExternalLink
              class="text-decoration-none fw-semibold d-inline-block w-100"
              href={window.baseDS.header!.links!.github!}
            >
              <div class="d-flex align-items-center">
                <SVGIcon kind={SVGIconKind.GitHub} class="me-2" />
                GitHub
              </div>
            </ExternalLink>
          </div>
        </Show>
      </nav>
    </div>
  );
};

export default MobileDropdown;
