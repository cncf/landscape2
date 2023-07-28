import { NavLink } from 'react-router-dom';

import CNCFLogo from '../../assets/images/CNCF_logo_white.svg';
import logo from '../../assets/images/cncf-landscape-horizontal-white.svg';
import qr from '../../assets/images/qr-l.svg';
import { SVGIconKind } from '../../types';
import SVGIcon from '../common/SVGIcon';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer role="contentinfo" className={`bg-black text-white mt-4 ${styles.footer}`}>
      <div className="container-fluid">
        <div className="d-flex flex-column flex-sm-row justify-content-between">
          <div className={`d-flex flex-column position-relative pb-5 ${styles.content}`}>
            <div className="d-flex flex-column flex-sm-row flex-wrap align-items-stretch justify-content-start text-light">
              <div className={`mb-4 mb-md-0 ${styles.logoCNCFWrapper}`}>
                <img className={styles.logoCNCF} alt="Logo CNCF" src={CNCFLogo} />
              </div>
              <div className={styles.footerCol}>
                <div className="h6 fw-bold text-uppercase">Project</div>
                <div className="d-flex flex-column text-start">
                  <NavLink className="link mb-1 opacity-75 text-white disabled text-decoration-none" to="/">
                    <div className="d-flex align-items-center">
                      <SVGIcon kind={SVGIconKind.Documentation} className="me-2" />
                      Documentation
                    </div>
                  </NavLink>
                </div>
              </div>
              <div className={styles.footerCol}>
                <div className="h6 fw-bold text-uppercase">Community</div>
                <div className="d-flex flex-column text-start">
                  <NavLink className="link mb-1 opacity-75 text-white disabled text-decoration-none" to="/">
                    <div className="d-flex align-items-center">
                      <SVGIcon kind={SVGIconKind.GitHub} className="me-2" />
                      GitHub
                    </div>
                  </NavLink>
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

            <div className={`bottom-0 ${styles.copyrightWrapper}`}>
              <div className={`text-white opacity-75 ${styles.copyright}`}>
                Copyright © 2023 The Linux Foundation®. All rights reserved. The Linux Foundation has registered
                trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our
                Trademark Usage page. Linux is a registered trademark of Linus Torvalds. Privacy Policy and Terms of
                Use.
              </div>
            </div>
          </div>

          <div className={`mt-4 mt-md-0 d-flex flex-column ms-0 ms-lg-auto ${styles.footerMobileSection}`}>
            <img className={`mx-auto mt-1 ${styles.qr}`} alt="QR code" src={qr} />
            <img className={`mt-3 ${styles.logo}`} alt="Logo Landscape" src={logo} />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
