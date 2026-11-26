import { ExternalLink, Image, SVGIcon, SVGIconKind } from 'common';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { For, Show } from 'solid-js';

import { FOUNDATION } from '../../data';
import { FooterLinks } from '../../types';
import styles from './Footer.module.css';

/** Social network link of the footer. */
interface SocialLink {
  /** Icon of the link. */
  icon: SVGIconKind;
  /** Footer links field holding the url. */
  key: Exclude<keyof FooterLinks, 'homepage'>;
  /** Accessible name of the link. */
  label: string;
}

/** Social network links of the footer, in display order. */
const SOCIAL_LINKS: SocialLink[] = [
  { icon: SVGIconKind.Twitter, key: 'twitter', label: 'Twitter' },
  { icon: SVGIconKind.GitHub, key: 'github', label: 'GitHub' },
  { icon: SVGIconKind.LinkedIn, key: 'linkedin', label: 'LinkedIn' },
  { icon: SVGIconKind.Instagram, key: 'instagram', label: 'Instagram' },
  { icon: SVGIconKind.WeChat, key: 'wechat', label: 'WeChat' },
  { icon: SVGIconKind.Youtube, key: 'youtube', label: 'YouTube' },
  { icon: SVGIconKind.Flickr, key: 'flickr', label: 'Flickr' },
  { icon: SVGIconKind.Facebook, key: 'facebook', label: 'Facebook' },
  { icon: SVGIconKind.Twitch, key: 'twitch', label: 'Twitch' },
  { icon: SVGIconKind.Slack, key: 'slack', label: 'Slack' },
  { icon: SVGIconKind.Forums, key: 'forums', label: 'Forums' },
];

const Footer = () => {
  const foundationLink = () =>
    window.baseDS.footer && window.baseDS.footer!.links ? window.baseDS.footer!.links!.homepage : undefined;
  // Social links configured for the landscape, with their url
  const socialLinks = () => {
    const links = window.baseDS.footer?.links ?? {};
    return SOCIAL_LINKS.flatMap((link) => {
      const href = links[link.key];
      return isUndefined(href) ? [] : [{ ...link, href }];
    });
  };

  return (
    <footer role="contentinfo" class={`position-relative bg-black text-white mt-4 ${styles.footer}`}>
      <div class="container-fluid px-0">
        <div class="d-flex flex-column flex-sm-row justify-content-between w-100">
          <div class="d-flex flex-column w-100">
            <Show when={!isUndefined(window.baseDS.footer)}>
              <div class="d-flex flex-row align-items-start justify-content-between">
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
                            <Image
                              class={styles.logo}
                              name={FOUNDATION}
                              logo={window.baseDS.footer!.logo!}
                              height={34}
                            />
                          </div>
                        }
                      >
                        <ExternalLink href={foundationLink()!} label={`${FOUNDATION} home`}>
                          <div class={styles.logoWrapper}>
                            <Image
                              class={`pe-none ${styles.logo}`}
                              name={FOUNDATION}
                              logo={window.baseDS.footer!.logo!}
                              height={34}
                            />
                          </div>
                        </ExternalLink>
                      </Show>
                    </Show>
                    <div class="ms-lg-auto mt-3 mt-lg-0 mw-100">
                      <Show when={socialLinks().length > 0}>
                        <div class={`d-flex flex-row flex-wrap ${styles.socialIcons}`}>
                          <For each={socialLinks()}>
                            {(link) => (
                              <ExternalLink
                                class={`me-3 me-lg-0 ms-0 ms-lg-3 ps-0 pe-2 ${styles.link}`}
                                href={link.href}
                                label={link.label}
                              >
                                <SVGIcon kind={link.icon} />
                              </ExternalLink>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  </div>
                </Show>
              </div>

              <hr class={styles.hr} />
            </Show>

            <div>
              <Show when={!isUndefined(window.baseDS.footer) && !isUndefined(window.baseDS.footer!.text)}>
                {/* eslint-disable-next-line solid/no-innerhtml -- the footer text is markdown rendered to HTML by the build */}
                <div class={`pt-2 ${styles.legend}`} innerHTML={window.baseDS.footer!.text} />
              </Show>
              <div class={`pt-2 ${styles.legend}`}>
                Powered by{' '}
                <ExternalLink
                  class="p-0 fw-semibold text-white text-decoration-underline"
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
            onClick={() => window.Osano?.cm.showDrawer('osano-cm-dom-info-dialog-open')}
            aria-label='Open "Cookie Preferences" dialog'
          >
            <SVGIcon kind={SVGIconKind.OsanoCookie} />
          </button>
        </div>
      </Show>
    </footer>
  );
};

export default Footer;
