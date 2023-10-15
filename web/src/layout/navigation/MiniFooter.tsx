import ExternalLink from '../common/ExternalLink';
import styles from './Footer.module.css';

const MiniFooter = () => {
  return (
    <footer role="contentinfo" class={`bg-black text-white mt-4 ${styles.footer}`}>
      <div class="container-fluid">
        <div class="d-flex flex-column flex-sm-row justify-content-between">
          <div class="d-flex flex-column">
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
                .
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MiniFooter;
