import { A } from '@solidjs/router';
import { ExternalLink, SVGIcon, SVGIconKind, useOutsideClick } from 'common';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createSignal, Show } from 'solid-js';

import { EXPLORE_PATH, GAMES_PATH, GUIDE_PATH, STATS_PATH } from '../../data';
import styles from './MobileDropdown.module.css';

interface Props {
  statsVisible: boolean;
  inSticky?: boolean;
}

const MobileDropdown = (props: Props) => {
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [ref, setRef] = createSignal<HTMLDivElement>();
  useOutsideClick([ref], [], visibleDropdown, () => setVisibleDropdown(false));

  const closeDropdown = () => {
    setVisibleDropdown(false);
  };

  return (
    <div ref={setRef} class="ms-auto position-relative">
      <button
        class={`btn btn-light btn-sm border-0 rounded-0 btnIconMobile ${styles.btn}`}
        classList={{ [styles.inSticky]: !isUndefined(props.inSticky) && props.inSticky }}
        type="button"
        onClick={() => setVisibleDropdown((prev) => !prev)}
        aria-label="Mobile settings button"
        aria-expanded={visibleDropdown()}
      >
        <div class="d-flex align-items-center justify-content-center h-100 w-100">
          <SVGIcon kind={SVGIconKind.ThreeBars} />
        </div>
      </button>

      <div role="menu" class={`dropdown-menu rounded-0 ${styles.dropdown}`} classList={{ show: visibleDropdown() }}>
        <div class={`d-block position-absolute ${styles.arrow}`} />
        <div class="dropdown-item my-2">
          <A
            class={`btn btn-link position-relative text-uppercase w-100 text-start fw-semibold text-decoration-none p-0 ${styles.link}`}
            activeClass="activeLink"
            href={EXPLORE_PATH}
            onClick={closeDropdown}
            end
          >
            Explore
          </A>
        </div>
        <Show when={!isUndefined(window.baseDS.guide_summary) && !isEmpty(window.baseDS.guide_summary)}>
          <div class="dropdown-item mb-2">
            <A
              class={`btn btn-link position-relative text-uppercase w-100 text-start fw-semibold text-decoration-none p-0 ${styles.link}`}
              href={GUIDE_PATH}
              activeClass="activeLink"
              state={{ from: 'mobileHeader' }}
              onClick={closeDropdown}
            >
              Guide
            </A>
          </div>
        </Show>
        <Show when={props.statsVisible}>
          <div class="dropdown-item mb-2">
            <A
              class={`btn btn-link position-relative text-uppercase w-100 text-start fw-semibold text-decoration-none p-0 ${styles.link}`}
              activeClass="activeLink"
              href={STATS_PATH}
              onClick={closeDropdown}
            >
              Stats
            </A>
          </div>
        </Show>
        <Show when={!isUndefined(window.baseDS.games_available)}>
          <div class="dropdown-item mb-2">
            <A
              class={`btn btn-link position-relative text-uppercase w-100 text-start fw-semibold text-decoration-none p-0 ${styles.link}`}
              activeClass="activeLink"
              href={GAMES_PATH}
              onClick={closeDropdown}
            >
              Games
            </A>
          </div>
        </Show>
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
              label="Open GitHub link"
              href={window.baseDS.header!.links!.github!}
            >
              <div class="d-flex align-items-center">
                <SVGIcon kind={SVGIconKind.GitHub} class="me-2" />
                GitHub
              </div>
            </ExternalLink>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default MobileDropdown;
