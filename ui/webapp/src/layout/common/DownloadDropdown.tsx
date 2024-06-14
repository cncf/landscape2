import { SVGIcon, SVGIconKind, useOutsideClick } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createSignal, Show } from 'solid-js';

import { BANNER_ID } from '../../data';
import styles from './DownloadDropdown.module.css';

enum DocType {
  Items = 'items',
  Landscape = 'landscape',
  Projects = 'projects',
}

enum Format {
  CSV = 'csv',
  PDF = 'pdf',
  PNG = 'png',
}

interface DocTypeDownloading {
  doc: DocType;
  format: Format;
}

const contentType = {
  [Format.CSV]: 'text/csv;charset=UTF-8',
  [Format.PDF]: 'application/pdf',
  [Format.PNG]: 'image/x-png',
};

const contentBlob = {
  [Format.CSV]: 'text/csv',
  [Format.PDF]: 'application/pdf',
  [Format.PNG]: 'image/png',
};

const DownloadDropdown = () => {
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [downloadingFile, setDownloadingFile] = createSignal<DocTypeDownloading | undefined>();
  useOutsideClick([ref], [BANNER_ID], visibleDropdown, () => setVisibleDropdown(false));

  const downloadFile = (doc: DocType, format: Format) => {
    async function getFile() {
      try {
        setDownloadingFile({ doc: doc, format: format });
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
              if ([Format.PDF, Format.PNG].includes(format)) {
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
                  <Show
                    when={
                      !isUndefined(downloadingFile()) &&
                      downloadingFile()!.doc === DocType.Landscape &&
                      downloadingFile()!.format === Format.PDF
                    }
                  >
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
            <button
              class="dropdown-item py-3 border-top"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                downloadFile(DocType.Landscape, Format.PNG);
              }}
            >
              <div class="d-flex flex-row align-items-start">
                <div class="me-3 position-relative">
                  <Show
                    when={
                      !isUndefined(downloadingFile()) &&
                      downloadingFile()!.doc === DocType.Landscape &&
                      downloadingFile()!.format === Format.PNG
                    }
                  >
                    <div class={`position-absolute ${styles.spinner}`}>
                      <div class="spinner-border text-secondary" role="status">
                        <span class="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  </Show>
                  <SVGIcon class={styles.icon} kind={SVGIconKind.PNG} />
                </div>
                <div class={styles.contentBtn}>
                  <div class="fw-semibold mb-2">landscape.png</div>
                  <div class={`text-wrap text-muted fst-italic ${styles.legend}`}>Landscape in PNG format</div>
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
