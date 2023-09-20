import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';

import { SVGIconKind } from '../../types';
import ExternalLink from '../common/ExternalLink';
import SVGIcon from '../common/SVGIcon';
import styles from './Footer.module.css';

interface Props {
  logo?: string;
}

const Footer = (props: Props) => {
  const renderSocialNetworkLinks = (): JSX.Element => {
    return (
      <div className={`d-flex flex-row ${styles.socialIcons}`}>
        {!isUndefined(window.baseDS.social_networks?.twitter) && (
          <ExternalLink
            className={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.twitter as string}
          >
            <SVGIcon kind={SVGIconKind.Twitter} />
          </ExternalLink>
        )}
        {!isUndefined(window.baseDS.social_networks?.github) && (
          <ExternalLink
            className={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.github as string}
          >
            <SVGIcon kind={SVGIconKind.GitHub} />
          </ExternalLink>
        )}
        {!isUndefined(window.baseDS.social_networks?.linkedin) && (
          <ExternalLink
            className={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.linkedin as string}
          >
            <SVGIcon kind={SVGIconKind.LinkedIn} />
          </ExternalLink>
        )}
        {!isUndefined(window.baseDS.social_networks?.instagram) && (
          <ExternalLink
            className={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.instagram as string}
          >
            <SVGIcon kind={SVGIconKind.Instagram} />
          </ExternalLink>
        )}
        {!isUndefined(window.baseDS.social_networks?.wechat) && (
          <ExternalLink
            className={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.wechat as string}
          >
            <SVGIcon kind={SVGIconKind.WeChat} />
          </ExternalLink>
        )}
        {!isUndefined(window.baseDS.social_networks?.youtube) && (
          <ExternalLink
            className={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.youtube as string}
          >
            <SVGIcon kind={SVGIconKind.Youtube} />
          </ExternalLink>
        )}
        {!isUndefined(window.baseDS.social_networks?.flickr) && (
          <ExternalLink
            className={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.flickr as string}
          >
            <SVGIcon kind={SVGIconKind.Flickr} />
          </ExternalLink>
        )}
        {!isUndefined(window.baseDS.social_networks?.facebook) && (
          <ExternalLink
            className={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.facebook as string}
          >
            <SVGIcon kind={SVGIconKind.Facebook} />
          </ExternalLink>
        )}
        {!isUndefined(window.baseDS.social_networks?.twitch) && (
          <ExternalLink
            className={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.twitch as string}
          >
            <SVGIcon kind={SVGIconKind.Twitch} />
          </ExternalLink>
        )}
        {!isUndefined(window.baseDS.social_networks?.slack) && (
          <ExternalLink
            className={`me-3 ps-0 pe-2 ${styles.link}`}
            href={window.baseDS.social_networks?.slack as string}
          >
            <SVGIcon kind={SVGIconKind.Slack} />
          </ExternalLink>
        )}
      </div>
    );
  };

  return (
    <footer role="contentinfo" className={`bg-black text-white mt-4 ${styles.footer}`}>
      <div className="container-fluid">
        <div className="d-flex flex-column flex-sm-row justify-content-between">
          <div className="d-flex flex-column">
            {(!isUndefined(props.logo) ||
              (!isUndefined(window.baseDS.social_networks) && !isEmpty(window.baseDS.social_networks))) && (
              <div className="d-flex flex-row justify-content-start align-items-center mb-5">
                {!isUndefined(window.baseDS.images.footer_logo) && (
                  <div className={styles.logoWrapper}>
                    <img
                      className={styles.logo}
                      alt="Logo"
                      src={import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `${props.logo}`}
                    />
                  </div>
                )}
                {renderSocialNetworkLinks()}
              </div>
            )}
            <div className="d-flex flex-column flex-sm-row flex-wrap align-items-stretch justify-content-start text-light">
              <div className={styles.footerCol}>
                <div className="h6 fw-bold text-uppercase">Project</div>
                <div className="d-flex flex-column text-start">
                  <ExternalLink
                    className="link mb-1 opacity-75 text-white disabled text-decoration-none"
                    href="https://github.com/cncf/landscape2"
                  >
                    <div className="d-flex align-items-center">
                      <SVGIcon kind={SVGIconKind.Documentation} className="me-2" />
                      Documentation
                    </div>
                  </ExternalLink>
                </div>
              </div>
              <div className={styles.footerCol}>
                <div className="h6 fw-bold text-uppercase">Community</div>
                <div className="d-flex flex-column text-start">
                  <ExternalLink
                    className="link mb-1 opacity-75 text-white disabled text-decoration-none"
                    href="https://github.com/cncf/landscape2"
                  >
                    <div className="d-flex align-items-center">
                      <SVGIcon kind={SVGIconKind.GitHub} className="me-2" />
                      GitHub
                    </div>
                  </ExternalLink>
                </div>
              </div>
              <div className={`${styles.footerCol} ${styles.about} pe-0`}>
                <div className="h6 fw-bold text-uppercase">About</div>
                <div className="opacity-75">
                  Landscape is an <b className="d-inline-block">Open Source</b> project licensed under the{' '}
                  <a
                    className="link d-inline-block mb-1 text-white"
                    href="https://www.apache.org/licenses/LICENSE-2.0"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open Apache License 2.0 documentation"
                  >
                    <div className="d-flex align-items-center">Apache License 2.0</div>
                  </a>
                </div>
              </div>
            </div>

            <hr className={styles.hr} />

            <div>
              <div className={`pt-2 ${styles.copyright}`}>
                Copyright © 2023 The Linux Foundation®. All rights reserved. The Linux Foundation has registered
                trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our{' '}
                <ExternalLink
                  className="p-0 fw-semibold text-white"
                  href="https://www.linuxfoundation.org/trademark-usage"
                >
                  Trademark Usage
                </ExternalLink>{' '}
                page. Linux is a registered trademark of Linus Torvalds.{' '}
                <ExternalLink className="p-0 fw-semibold text-white" href="https://www.linuxfoundation.org/privacy">
                  Privacy Policy
                </ExternalLink>{' '}
                and{' '}
                <ExternalLink className="p-0 fw-semibold text-white" href="https://www.linuxfoundation.org/terms">
                  Terms of Use
                </ExternalLink>
                . This website contains data received from Crunchbase. This data is not licensed pursuant to the Apache
                License. It is subject to Crunchbase's Data Access Terms, available at{' '}
                <ExternalLink className="p-0 fw-semibold text-white" href="https://data.crunchbase.com/docs/terms">
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
