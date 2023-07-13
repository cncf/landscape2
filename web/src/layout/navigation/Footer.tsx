import styles from './Footer.module.css';
import qr from '../../assets/images/qr-l.svg';
import logo from '../../assets/images/cncf-landscape-horizontal-white.svg';
import CNCFLogo from '../../assets/images/CNCF_logo_white.svg';

const Footer = () => {
  return (
    <footer role="contentinfo" className={`bg-black text-white mt-4 ${styles.footer}`}>
      <div className="container-fluid">
        <div className="d-flex flex-column flex-sm-row justify-content-between">
          <div className={`d-flex flex-column ${styles.content}`}>
            <div className="d-flex flex-column flex-sm-row flex-wrap align-items-stretch justify-content-start text-light">
              <div className={`mb-4 mb-md-0 ${styles.logoCNCFWrapper}`}>
                <img className={styles.logoCNCF} alt="Logo CNCF" src={CNCFLogo} />
              </div>
              <div className={styles.footerCol}>
                <div className="h6 fw-bold text-uppercase">Project</div>
                <div className="d-flex flex-column text-start">
                  <a
                    className="link mb-1 opacity-75 text-white"
                    href="/"
                    target="_self"
                    rel="noopener noreferrer"
                    aria-label="Open documentation"
                  >
                    <div className="d-flex align-items-center">
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 512 512"
                        className="me-2"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M84 480H28a12 12 0 01-12-12V92a12 12 0 0112-12h56a12 12 0 0112 12v376a12 12 0 01-12 12zm156-272v-52a12 12 0 00-12-12H124a12 12 0 00-12 12v52zM112 416v52a12 12 0 0012 12h104a12 12 0 0012-12v-52zm0-176h128v144H112zm228 240h-72a12 12 0 01-12-12V44a12 12 0 0112-12h72a12 12 0 0112 12v424a12 12 0 01-12 12zm29-379.3l30 367.83a12 12 0 0013.45 10.92l72.16-9a12 12 0 0010.47-12.9L465 91.21a12 12 0 00-13.2-10.94l-72.13 7.51A12 12 0 00369 100.7z"></path>
                      </svg>
                      Documentation
                    </div>
                  </a>
                </div>
              </div>
              <div className={styles.footerCol}>
                <div className="h6 fw-bold text-uppercase">Community</div>
                <div className="d-flex flex-column text-start">
                  <a
                    className="link mb-1 opacity-75 text-white"
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open Github"
                  >
                    <div className="d-flex align-items-center">
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 496 512"
                        className="me-2"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"></path>
                      </svg>
                      GitHub
                    </div>
                  </a>
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
            <div>
              <hr className={styles.hr} />
              <div className="d-flex flex-row">
                <div className={`text-white opacity-75 ${styles.copyright}`}>
                  Copyright © 2023 The Linux Foundation®. All rights reserved. The Linux Foundation has registered
                  trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our
                  Trademark Usage page. Linux is a registered trademark of Linus Torvalds. Privacy Policy and Terms of
                  Use.
                </div>
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
