// import BadgeModal from './BadgeModal';
import { isUndefined } from 'lodash';
import { createSignal, Show } from 'solid-js';

import { useOutsideClick } from '../../hooks/useOutsideClick';
import { SVGIconKind } from '../../types';
import styles from './DownloadDropdown.module.css';
import SVGIcon from './SVGIcon';

enum DocType {
  Items = 'items',
  Projects = 'projects',
}

interface CSVDownloading {
  doc: DocType;
}

const DownloadDropdown = () => {
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [downloadingCSV, setDownloadingCSV] = createSignal<CSVDownloading | undefined>();
  useOutsideClick([ref], visibleDropdown, () => setVisibleDropdown(false));

  const downloadCSV = (doc: DocType) => {
    async function getCSV() {
      try {
        setDownloadingCSV({ doc: doc });
        fetch(import.meta.env.MODE === 'development' ? `../../static/docs/${doc}.csv` : `./docs/${doc}.csv`, {
          method: 'get',
          headers: {
            'content-type': 'text/csv;charset=UTF-8',
          },
        })
          .then((response) => response.text())
          .then((csv) => {
            const blob = new Blob([csv], {
              type: 'text/csv',
            });
            const link: HTMLAnchorElement = document.createElement('a');
            link.download = `${doc}.csv`;
            link.href = window.URL.createObjectURL(blob);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setDownloadingCSV();
            setVisibleDropdown(false);
          });
      } catch {
        // TODO - error downloading
        setDownloadingCSV();
        setVisibleDropdown(false);
      }
    }
    getCSV();
  };

  return (
    <div ref={setRef} class="ms-2 position-relative">
      <button
        data-testid="dropdown-btn"
        type="button"
        class={`btn btn-md p-0 rounded-0 lh-1 ${styles.btn}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setVisibleDropdown(!visibleDropdown());
        }}
      >
        <SVGIcon kind={SVGIconKind.Download} />
      </button>

      <div
        role="complementary"
        class={`dropdown-menu rounded-0 p-0 ${styles.dropdown}`}
        classList={{ show: visibleDropdown() }}
      >
        <div class={`d-block position-absolute ${styles.arrow}`} />
        <ul class={`m-0 p-0 ${styles.menuList}`}>
          <li>
            <div class={`text-uppercase text-center fw-semibold p-2 ${styles.dropdownHeader}`}>Data files</div>
          </li>
          <li>
            <button
              class="dropdown-item py-3 border-top"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                downloadCSV(DocType.Items);
              }}
            >
              <div class="d-flex flex-row align-items-start">
                <div class="me-3 position-relative">
                  <Show when={!isUndefined(downloadingCSV()) && downloadingCSV()!.doc === DocType.Items}>
                    <div class={`position-absolute ${styles.spinner}`}>
                      <div class="spinner-border text-secondary" role="status">
                        <span class="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  </Show>
                  <SVGIcon class={styles.icon} kind={SVGIconKind.CSV} />
                </div>
                <div class={styles.contentBtn}>
                  <div class="fw-semibold mb-2">items.csv</div>
                  <div class={`text-wrap text-muted fst-italic ${styles.legend}`}>
                    CSV file that contains information about all items available in the landscape
                  </div>
                </div>
              </div>
            </button>
          </li>
          <li>
            <button
              class="dropdown-item py-3 border-top"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                downloadCSV(DocType.Projects);
              }}
            >
              <div class="d-flex flex-row align-items-start">
                <div class="me-3 position-relative">
                  <Show when={!isUndefined(downloadingCSV()) && downloadingCSV()!.doc === DocType.Projects}>
                    <div class={`position-absolute ${styles.spinner}`}>
                      <div class="spinner-border text-secondary" role="status">
                        <span class="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  </Show>
                  <SVGIcon class={styles.icon} kind={SVGIconKind.CSV} />
                </div>
                <div class={styles.contentBtn}>
                  <div class="fw-semibold mb-2">projects.csv</div>
                  <div class={`text-wrap text-muted fst-italic ${styles.legend}`}>
                    CSV file that contains information about all the projects that are part of the foundation
                  </div>
                </div>
              </div>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DownloadDropdown;
