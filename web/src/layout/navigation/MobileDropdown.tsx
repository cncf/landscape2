import { A } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createSignal, Show } from 'solid-js';

import { useOutsideClick } from '../../hooks/useOutsideClick';
import { SVGIconKind } from '../../types';
import ExternalLink from '../common/ExternalLink';
import SVGIcon from '../common/SVGIcon';
import styles from './MobileDropdown.module.css';

interface Props {
  inSticky?: boolean;
}

const MobileDropdown = (props: Props) => {
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [ref, setRef] = createSignal<HTMLDivElement>();
  useOutsideClick([ref], visibleDropdown, () => setVisibleDropdown(false));

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
        <SVGIcon kind={SVGIconKind.ThreeBars} />
      </button>

      <div role="menu" class={`dropdown-menu rounded-0 ${styles.dropdown}`} classList={{ show: visibleDropdown() }}>
        <div class={`d-block position-absolute ${styles.arrow}`} />
        <div class="dropdown-item my-2">
          <A
            class={`btn btn-link position-relative text-uppercase w-100 text-start fw-semibold text-decoration-none p-0 ${styles.link}`}
            activeClass="activeLink"
            href="/"
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
              href="/guide"
              activeClass="activeLink"
              state={{ from: 'header' }}
              onClick={closeDropdown}
            >
              Guide
            </A>
          </div>
        </Show>
        <div class="dropdown-item mb-2">
          <A
            class={`btn btn-link position-relative text-uppercase w-100 text-start fw-semibold text-decoration-none p-0 ${styles.link}`}
            activeClass="activeLink"
            href="/stats"
            onClick={closeDropdown}
          >
            Stats
          </A>
        </div>
        <hr />
        <div class="dropdown-item mb-2">
          <ExternalLink
            class="text-decoration-none fw-semibold d-inline-block w-100"
            label="Open documentation"
            href="https://github.com/cncf/landscape2"
          >
            <div class="d-flex align-items-center">
              <SVGIcon kind={SVGIconKind.Documentation} class="me-2" />
              Documentation
            </div>
          </ExternalLink>
        </div>
        <div class="dropdown-item mb-2">
          <ExternalLink
            class="text-decoration-none fw-semibold d-inline-block w-100"
            label="Open documentation"
            href="https://github.com/cncf/landscape2"
          >
            <div class="d-flex align-items-center">
              <SVGIcon kind={SVGIconKind.GitHub} class="me-2" />
              GitHub
            </div>
          </ExternalLink>
        </div>
      </div>
    </div>
  );
};

export default MobileDropdown;
