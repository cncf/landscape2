import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';

import ExternalLink from '../common/ExternalLink';
import styles from './Footer.module.css';

const MiniFooter = () => {
  return (
    <footer role="contentinfo" class={`bg-black text-white mt-4 ${styles.footer}`}>
      <div class="container-fluid">
        <div class="d-flex flex-column flex-sm-row justify-content-between">
          <div class="d-flex flex-column">
            <div>
              <Show when={!isUndefined(window.baseDS.footer) && !isUndefined(window.baseDS.footer!.text)}>
                {/* eslint-disable-next-line solid/no-innerhtml */}
                <div class={`pb-2 ${styles.legend}`} innerHTML={window.baseDS.footer!.text} />
              </Show>
              <div class={styles.legend}>
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
    </footer>
  );
};

export default MiniFooter;
