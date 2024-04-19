import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { JSXElement, Show } from 'solid-js';

import { SVGIconKind } from '../../types';
import ExternalLink from '../common/ExternalLink';
import Image from '../common/Image';
import SVGIcon from '../common/SVGIcon';
import styles from './Footer.module.css';

const Footer = () => {
  const foundationLink = () =>
    window.baseDS.footer && window.baseDS.footer!.links ? window.baseDS.footer!.links!.homepage : undefined;

  const renderSocialNetworkLinks = (): JSXElement => {
    const links = window.baseDS.footer!.links;

    return (
      <Show when={!isEmpty(links)}>
        <div class={`d-flex flex-row flex-wrap ${styles.socialIcons}`}>
          <Show when={!isUndefined(links!.twitter)}>
            <ExternalLink class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`} href={links!.twitter as string}>
              <SVGIcon kind={SVGIconKind.Twitter} />
            </ExternalLink>
          </Show>
          <Show when={!isUndefined(links!.github)}>
            <ExternalLink class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`} href={links!.github as string}>
              <SVGIcon kind={SVGIconKind.GitHub} />
            </ExternalLink>
          </Show>
          <Show when={!isUndefined(links!.linkedin)}>
            <ExternalLink class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`} href={links!.linkedin as string}>
              <SVGIcon kind={SVGIconKind.LinkedIn} />
            </ExternalLink>
          </Show>
          <Show when={!isUndefined(links!.instagram)}>
            <ExternalLink
              class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`}
              href={links!.instagram as string}
            >
              <SVGIcon kind={SVGIconKind.Instagram} />
            </ExternalLink>
          </Show>
          <Show when={!isUndefined(links!.wechat)}>
            <ExternalLink class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`} href={links!.wechat as string}>
              <SVGIcon kind={SVGIconKind.WeChat} />
            </ExternalLink>
          </Show>
          <Show when={!isUndefined(links!.youtube)}>
            <ExternalLink class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`} href={links!.youtube as string}>
              <SVGIcon kind={SVGIconKind.Youtube} />
            </ExternalLink>
          </Show>
          <Show when={!isUndefined(links!.flickr)}>
            <ExternalLink class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`} href={links!.flickr as string}>
              <SVGIcon kind={SVGIconKind.Flickr} />
            </ExternalLink>
          </Show>
          <Show when={!isUndefined(links!.facebook)}>
            <ExternalLink class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`} href={links!.facebook as string}>
              <SVGIcon kind={SVGIconKind.Facebook} />
            </ExternalLink>
          </Show>
          <Show when={!isUndefined(links!.twitch)}>
            <ExternalLink class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`} href={links!.twitch as string}>
              <SVGIcon kind={SVGIconKind.Twitch} />
            </ExternalLink>
          </Show>
          <Show when={!isUndefined(links!.slack)}>
            <ExternalLink class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`} href={links!.slack as string}>
              <SVGIcon kind={SVGIconKind.Slack} />
            </ExternalLink>
          </Show>
        </div>
      </Show>
    );
  };

  return (
    <footer role="contentinfo" class={`position-relative bg-black text-white mt-4 ${styles.footer}`}>
      <div class="container-fluid px-0 px-lg-auto">
        <div class="d-flex flex-column flex-sm-row justify-content-between w-100">
          <div class="d-flex flex-column w-100">
            <Show when={!isUndefined(window.baseDS.footer)}>
              <div class="d-flex flex-row align-items-top justify-content-between">
                <Show
                  when={
                    !isUndefined(window.baseDS.footer!.logo) ||
                    (!isUndefined(window.baseDS.footer!.links) && !isEmpty(window.baseDS.footer!.links))
                  }
                >
                  <div class="d-flex flex-column flex-lg-row justify-content-start align-items-lg-center w-100">
                    <Show when={!isUndefined(window.baseDS.footer!.logo)}>
                      <Show
                        when={!isUndefined(foundationLink())}
                        fallback={
                          <div class={styles.logoWrapper}>
                            <Image class={styles.logo} name="Logo" logo={window.baseDS.footer!.logo!} height={34} />
                          </div>
                        }
                      >
                        <ExternalLink href={foundationLink()!}>
                          <div class={styles.logoWrapper}>
                            <Image
                              class={`pe-none ${styles.logo}`}
                              name="Logo"
                              logo={window.baseDS.footer!.logo!}
                              height={34}
                            />
                          </div>
                        </ExternalLink>
                      </Show>
                    </Show>
                    <div class="ms-lg-auto mt-3 mt-lg-0 mw-100">{renderSocialNetworkLinks()}</div>
                  </div>
                </Show>
              </div>

              <hr class={styles.hr} />
            </Show>

            <div>
              <Show when={!isUndefined(window.baseDS.footer) && !isUndefined(window.baseDS.footer!.text)}>
                {/* eslint-disable-next-line solid/no-innerhtml */}
                <div class={`pt-2 ${styles.legend}`} innerHTML={window.baseDS.footer!.text} />
              </Show>
              <div class={`pt-2 ${styles.legend}`}>
                Powered by{' '}
                <ExternalLink
                  class="p-0 fw-semibold text-white text-underline"
                  href="https://github.com/cncf/landscape2"
                >
                  CNCF interactive landscapes generator
                </ExternalLink>
                .
              </div>
            </div>
          </div>
        </div>
      </div>

      <Show when={window.navigator.onLine && !isUndefined(window.Osano)}>
        <div id="osano-cookie" class={`position-absolute ${styles.cookieBtnWrapper}`}>
          <button
            class={`btn btn-link btn-lg ${styles.cookieBtn}`}
            onClick={() => window.Osano.cm.showDrawer('osano-cm-dom-info-dialog-open')}
          >
            <SVGIcon kind={SVGIconKind.OsanoCookie} />
          </button>
        </div>
      </Show>
    </footer>
  );
};

export default Footer;
