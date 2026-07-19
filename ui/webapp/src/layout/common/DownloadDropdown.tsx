import { SVGIcon, SVGIconKind, useOutsideClick } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createSignal, onCleanup, onMount, Show } from 'solid-js';

import { BANNER_ID } from '../../data';
import getDownloadBlob from '../../utils/getDownloadBlob';
import isDownloadAvailable from '../../utils/isDownloadAvailable';
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
  const [availableScreenshotFormats, setAvailableScreenshotFormats] = createSignal<Set<Format>>(new Set());
  useOutsideClick([ref], [BANNER_ID], visibleDropdown, () => setVisibleDropdown(false));

  const getDocumentUrl = (doc: DocType, format: Format) =>
    import.meta.env.MODE === 'development' ? `../../static/docs/${doc}.${format}` : `./docs/${doc}.${format}`;

  const downloadFile = async (doc: DocType, format: Format) => {
    if (!isUndefined(downloadingFile())) {
      return;
    }

    setDownloadingFile({ doc, format });

    try {
      const blob = await getDownloadBlob({
        blobType: contentBlob[format],
        contentType: contentType[format],
        responseAsBlob: [Format.PDF, Format.PNG].includes(format),
        url: getDocumentUrl(doc, format),
      });
      const link: HTMLAnchorElement = document.createElement('a');
      const objectUrl = window.URL.createObjectURL(blob);

      // Use a temporary link to preserve the generated file name.
      try {
        link.download = `${doc}.${format}`;
        link.href = objectUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
      }
    } catch {
      return;
    } finally {
      // Always clear the pending state, including when the file is missing.
      setDownloadingFile();
      setVisibleDropdown(false);
    }
  };

  onMount(() => {
    // Screenshot generation is optional, so only expose artifacts that exist.
    const abortController = new AbortController();

    void Promise.all(
      [Format.PDF, Format.PNG].map(async (format) => ({
        available: await isDownloadAvailable(getDocumentUrl(DocType.Landscape, format), abortController.signal),
        format,
      }))
    )
      .then((results) => {
        setAvailableScreenshotFormats(
          new Set(results.filter((result) => result.available).map((result) => result.format))
        );
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setAvailableScreenshotFormats(new Set<Format>());
        }
      });

    onCleanup(() => abortController.abort());
  });

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
        aria-label="Open dropdown"
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
          <Show when={availableScreenshotFormats().size > 0}>
            <li>
              <div class={`text-uppercase text-center fw-semibold p-2 ${styles.dropdownHeader}`}>Landscape</div>
            </li>
          </Show>
          <Show when={availableScreenshotFormats().has(Format.PDF)}>
            <li>
              <button
                class="dropdown-item py-3 border-top"
                disabled={!isUndefined(downloadingFile())}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  void downloadFile(DocType.Landscape, Format.PDF);
                }}
                aria-label="Download landscape in PDF format"
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
          </Show>
          <Show when={availableScreenshotFormats().has(Format.PNG)}>
            <li>
              <button
                class="dropdown-item py-3 border-top"
                disabled={!isUndefined(downloadingFile())}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  void downloadFile(DocType.Landscape, Format.PNG);
                }}
                aria-label="Download landscape in PNG format"
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
          </Show>
          <li>
            <div class={`text-uppercase text-center fw-semibold p-2 ${styles.dropdownHeader}`}>Data files</div>
          </li>
          <li>
            <button
              class="dropdown-item py-3 border-top"
              disabled={!isUndefined(downloadingFile())}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                void downloadFile(DocType.Items, Format.CSV);
              }}
              aria-label="Download items in CSV format"
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
              disabled={!isUndefined(downloadingFile())}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                void downloadFile(DocType.Projects, Format.CSV);
              }}
              aria-label="Download projects in CSV format"
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
