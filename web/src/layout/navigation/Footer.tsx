import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { JSXElement, Show } from 'solid-js';

import { SVGIconKind } from '../../types';
import ExternalLink from '../common/ExternalLink';
import SVGIcon from '../common/SVGIcon';
import styles from './Footer.module.css';

interface Props {
  logo?: string;
}

const Footer = (props: Props) => {
  const renderSocialNetworkLinks = (): JSXElement => {
    return (
      <div class={`d-flex flex-row flex-wrap ${styles.socialIcons}`}>
        <Show when={!isUndefined(window.baseDS.social_networks?.twitter)}>
          <ExternalLink class={`me-3 ps-0 pe-2 ${styles.link}`} href={window.baseDS.social_networks?.twitter as string}>
            <SVGIcon kind={SVGIconKind.Twitter} />
          </ExternalLink>
        </Show>
        <Show when={!isUndefined(window.baseDS.social_networks?.github)}>
          <ExternalLink class={`me-3 ps-0 pe-2 ${styles.link}`} href={window.baseDS.social_networks?.github as string}>
            <SVGIcon kind={SVGIconKind.GitHub} />
          </ExternalLink>
        </Show>
        <Show when={!isUndefined(window.baseDS.social_networks?.linkedin)}>
          <ExternalLink
            class={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.linkedin as string}
          >
            <SVGIcon kind={SVGIconKind.LinkedIn} />
          </ExternalLink>
        </Show>
        <Show when={!isUndefined(window.baseDS.social_networks?.instagram)}>
          <ExternalLink
            class={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.instagram as string}
          >
            <SVGIcon kind={SVGIconKind.Instagram} />
          </ExternalLink>
        </Show>
        <Show when={!isUndefined(window.baseDS.social_networks?.wechat)}>
          <ExternalLink class={`me-3 ps-0 pe-2 ${styles.link}`} href={window.baseDS.social_networks?.wechat as string}>
            <SVGIcon kind={SVGIconKind.WeChat} />
          </ExternalLink>
        </Show>
        <Show when={!isUndefined(window.baseDS.social_networks?.youtube)}>
          <ExternalLink class={`me-3 ps-0 pe-2 ${styles.link}`} href={window.baseDS.social_networks?.youtube as string}>
            <SVGIcon kind={SVGIconKind.Youtube} />
          </ExternalLink>
        </Show>
        <Show when={!isUndefined(window.baseDS.social_networks?.flickr)}>
          <ExternalLink class={`me-3 ps-0 pe-2 ${styles.link}`} href={window.baseDS.social_networks?.flickr as string}>
            <SVGIcon kind={SVGIconKind.Flickr} />
          </ExternalLink>
        </Show>
        <Show when={!isUndefined(window.baseDS.social_networks?.facebook)}>
          <ExternalLink
            class={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.facebook as string}
          >
            <SVGIcon kind={SVGIconKind.Facebook} />
          </ExternalLink>
        </Show>
        <Show when={!isUndefined(window.baseDS.social_networks?.twitch)}>
          <ExternalLink class={`me-3 ps-0 pe-2 ${styles.link}`} href={window.baseDS.social_networks?.twitch as string}>
            <SVGIcon kind={SVGIconKind.Twitch} />
          </ExternalLink>
        </Show>
        <Show when={!isUndefined(window.baseDS.social_networks?.slack)}>
          <ExternalLink class={`me-3 ps-0 pe-2 ${styles.link}`} href={window.baseDS.social_networks?.slack as string}>
            <SVGIcon kind={SVGIconKind.Slack} />
          </ExternalLink>
        </Show>
      </div>
    );
  };

  return (
    <footer role="contentinfo" class={`bg-black text-white mt-4 ${styles.footer}`}>
      <div class="container-fluid px-0 px-lg-auto">
        <div class="d-flex flex-column flex-sm-row justify-content-between">
          <div class="d-flex flex-column">
            <div class="d-flex flex-row align-items-top justify-content-between">
              <Show
                when={
                  !isUndefined(props.logo) ||
                  (!isUndefined(window.baseDS.social_networks) && !isEmpty(window.baseDS.social_networks))
                }
              >
                <div class="d-flex flex-column flex-lg-row justify-content-start align-items-lg-center mb-3 mb-lg-5">
                  <Show when={!isUndefined(window.baseDS.images.footer_logo)}>
                    <div class={styles.logoWrapper}>
                      <img
                        class={styles.logo}
                        alt="Logo"
                        src={import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `${props.logo}`}
                        height={34}
                        width="auto"
                      />
                    </div>
                  </Show>
                  <div class="mt-3 mt-lg-0 mw-100">{renderSocialNetworkLinks()}</div>
                </div>
              </Show>
              <Show when={!isUndefined(window.baseDS.qr_code)}>
                <img
                  class={styles.qr}
                  alt="QR code"
                  src={
                    import.meta.env.MODE === 'development'
                      ? `../../static/${window.baseDS.qr_code}`
                      : window.baseDS.qr_code
                  }
                  height={60}
                  width={60}
                />
              </Show>
            </div>
            <div class="d-flex flex-column flex-md-row flex-wrap align-items-stretch justify-content-start text-light">
              <div class={styles.footerCol}>
                <div class="h6 fw-bold text-uppercase">Project</div>
                <div class="d-flex flex-column text-start">
                  <ExternalLink
                    class="link mb-1 opacity-75 text-white disabled text-decoration-none"
                    href="https://github.com/cncf/landscape2"
                  >
                    <div class="d-flex align-items-center">
                      <SVGIcon kind={SVGIconKind.Documentation} class="me-2" />
                      Documentation
                    </div>
                  </ExternalLink>
                </div>
              </div>
              <div class={styles.footerCol}>
                <div class="h6 fw-bold text-uppercase">Community</div>
                <div class="d-flex flex-column text-start">
                  <ExternalLink
                    class="link mb-1 opacity-75 text-white disabled text-decoration-none"
                    href="https://github.com/cncf/landscape2"
                  >
                    <div class="d-flex align-items-center">
                      <SVGIcon kind={SVGIconKind.GitHub} class="me-2" />
                      GitHub
                    </div>
                  </ExternalLink>
                </div>
              </div>
              <div class={`${styles.footerCol} ${styles.about} pe-0`}>
                <div class="h6 fw-bold text-uppercase">About</div>
                <div class="opacity-75">
                  Landscape is an <b class="d-inline-block">Open Source</b> project licensed under the{' '}
                  <a
                    class="link d-inline-block mb-1 text-white"
                    href="https://www.apache.org/licenses/LICENSE-2.0"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open Apache License 2.0 documentation"
                  >
                    <div class="d-flex align-items-center">Apache License 2.0</div>
                  </a>
                </div>
              </div>
            </div>

            <hr class={styles.hr} />

            <div>
              <div class={`pt-2 ${styles.copyright}`}>
                Copyright © 2023 The Linux Foundation®. All rights reserved. The Linux Foundation has registered
                trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our{' '}
                <ExternalLink class="p-0 fw-semibold text-white" href="https://www.linuxfoundation.org/trademark-usage">
                  Trademark Usage
                </ExternalLink>{' '}
                page. Linux is a registered trademark of Linus Torvalds.{' '}
                <ExternalLink class="p-0 fw-semibold text-white" href="https://www.linuxfoundation.org/privacy">
                  Privacy Policy
                </ExternalLink>{' '}
                and{' '}
                <ExternalLink class="p-0 fw-semibold text-white" href="https://www.linuxfoundation.org/terms">
                  Terms of Use
                </ExternalLink>
                . This website contains data received from Crunchbase. This data is not licensed pursuant to the Apache
                License. It is subject to Crunchbase's Data Access Terms, available at{' '}
                <ExternalLink class="p-0 fw-semibold text-white" href="https://data.crunchbase.com/docs/terms">
                  https://data.crunchbase.com/docs/terms
                </ExternalLink>
                , and is only permitted to be used with Linux Foundation landscape projects.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
