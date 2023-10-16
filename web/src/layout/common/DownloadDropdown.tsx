// import BadgeModal from './BadgeModal';
import { isUndefined } from 'lodash';
import { createSignal, Show } from 'solid-js';

import { useOutsideClick } from '../../hooks/useOutsideClick';
import { SVGIconKind } from '../../types';
import styles from './DownloadDropdown.module.css';
import SVGIcon from './SVGIcon';

enum DocType {
  Items = 'items',
  Landscape = 'landscape',
  Projects = 'projects',
}

enum Format {
  CSV = 'csv',
  PDF = 'pdf',
}

interface DocTypeDownloading {
  doc: DocType;
}

const contentType = {
  [Format.CSV]: 'text/csv;charset=UTF-8',
  [Format.PDF]: 'application/pdf',
};

const contentBlob = {
  [Format.CSV]: 'text/csv',
  [Format.PDF]: 'application/pdf',
};

const DownloadDropdown = () => {
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [downloadingFile, setDownloadingFile] = createSignal<DocTypeDownloading | undefined>();
  useOutsideClick([ref], visibleDropdown, () => setVisibleDropdown(false));

  const downloadFile = (doc: DocType, format: Format) => {
    async function getFile() {
      try {
        setDownloadingFile({ doc: doc });
        fetch(
          import.meta.env.MODE === 'development' ? `../../static/docs/${doc}.${format}` : `./docs/${doc}.${format}`,
          {
            method: 'get',
            headers: {
              'content-type': contentType[format],
            },
          }
        )
          .then(async (response) => {
            if (response.ok) {
              if (format === Format.PDF) {
                return response.blob();
              } else {
                const data = await response.text();
                const blob = new Blob([data], {
                  type: contentBlob[format],
                });
                return blob;
              }
            } else {
              throw Error;
            }
          })
          .then((blob) => {
            const link: HTMLAnchorElement = document.createElement('a');
            link.download = `${doc}.${format}`;
            link.href = window.URL.createObjectURL(blob);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setDownloadingFile();
            setVisibleDropdown(false);
          });
      } catch {
        // TODO - error downloading
        setDownloadingFile();
        setVisibleDropdown(false);
      }
    }
    getFile();
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
            <div class={`text-uppercase text-center fw-semibold p-2 ${styles.dropdownHeader}`}>Landscape</div>
          </li>
          <li>
            <button
              class="dropdown-item py-3 border-top"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                downloadFile(DocType.Landscape, Format.PDF);
              }}
            >
              <div class="d-flex flex-row align-items-start">
                <div class="me-3 position-relative">
                  <Show when={!isUndefined(downloadingFile()) && downloadingFile()!.doc === DocType.Landscape}>
                    <div class={`position-absolute ${styles.spinner}`}>
                      <div class="spinner-border text-secondary" role="status">
                        <span class="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  </Show>
                  <SVGIcon class={styles.icon} kind={SVGIconKind.PDF} />
                </div>
                <div class={styles.contentBtn}>
                  <div class="fw-semibold mb-2">landscape.pdf</div>
                  <div class={`text-wrap text-muted fst-italic ${styles.legend}`}>Landscape in PDF format</div>
                </div>
              </div>
            </button>
          </li>
          <li>
            <div class={`text-uppercase text-center fw-semibold p-2 ${styles.dropdownHeader}`}>Data files</div>
          </li>
          <li>
            <button
              class="dropdown-item py-3 border-top"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                downloadFile(DocType.Items, Format.CSV);
              }}
            >
              <div class="d-flex flex-row align-items-start">
                <div class="me-3 position-relative">
                  <Show when={!isUndefined(downloadingFile()) && downloadingFile()!.doc === DocType.Items}>
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

                downloadFile(DocType.Projects, Format.CSV);
              }}
            >
              <div class="d-flex flex-row align-items-start">
                <div class="me-3 position-relative">
                  <Show when={!isUndefined(downloadingFile()) && downloadingFile()!.doc === DocType.Projects}>
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
