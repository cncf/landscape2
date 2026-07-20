import { SVGIcon, SVGIconKind, useOutsideClick } from 'common';
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';

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

interface DownloadMenuItemProps {
  disabled: boolean;
  downloading: boolean;
  onDownload: () => void;
  option: DownloadOption;
}

interface DownloadOption {
  description: string;
  doc: DocType;
  format: Format;
}

interface FormatConfig {
  blobType: string;
  contentType: string;
  icon: SVGIconKind;
  responseAsBlob: boolean;
}

// Data exports are always generated, so they do not need availability checks.
const DATA_DOWNLOAD_OPTIONS: DownloadOption[] = [
  {
    description: 'CSV file that contains information about all items available in the landscape',
    doc: DocType.Items,
    format: Format.CSV,
  },
  {
    description: 'CSV file that contains information about all the projects that are part of the foundation',
    doc: DocType.Projects,
    format: Format.CSV,
  },
];

// Keep MIME handling and icons aligned for every format.
const FORMAT_CONFIG: Record<Format, FormatConfig> = {
  [Format.CSV]: {
    blobType: 'text/csv',
    contentType: 'text/csv;charset=UTF-8',
    icon: SVGIconKind.CSV,
    responseAsBlob: false,
  },
  [Format.PDF]: {
    blobType: 'application/pdf',
    contentType: 'application/pdf',
    icon: SVGIconKind.PDF,
    responseAsBlob: true,
  },
  [Format.PNG]: {
    blobType: 'image/png',
    contentType: 'image/x-png',
    icon: SVGIconKind.PNG,
    responseAsBlob: true,
  },
};

// Screenshot exports are optional and are filtered by availability.
const LANDSCAPE_DOWNLOAD_OPTIONS: DownloadOption[] = [
  {
    description: 'Landscape in PDF format',
    doc: DocType.Landscape,
    format: Format.PDF,
  },
  {
    description: 'Landscape in PNG format',
    doc: DocType.Landscape,
    format: Format.PNG,
  },
];

const SCREENSHOT_FORMATS = [Format.PDF, Format.PNG];

const DownloadDropdown = () => {
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [downloadingFile, setDownloadingFile] = createSignal<DownloadOption>();
  const [availableScreenshotFormats, setAvailableScreenshotFormats] = createSignal<Set<Format>>(new Set());
  useOutsideClick([ref], [BANNER_ID], visibleDropdown, () => setVisibleDropdown(false));

  // Keep each successfully generated screenshot format available independently.
  const availableLandscapeDownloads = () =>
    LANDSCAPE_DOWNLOAD_OPTIONS.filter((option) => availableScreenshotFormats().has(option.format));

  const isDownloading = (option: DownloadOption) => {
    const currentDownload = downloadingFile();
    return currentDownload?.doc === option.doc && currentDownload.format === option.format;
  };

  const downloadFile = async (option: DownloadOption) => {
    if (downloadingFile()) {
      return;
    }

    setDownloadingFile(option);

    try {
      const formatConfig = FORMAT_CONFIG[option.format];
      const blob = await getDownloadBlob({
        blobType: formatConfig.blobType,
        contentType: formatConfig.contentType,
        responseAsBlob: formatConfig.responseAsBlob,
        url: getDocumentUrl(option),
      });
      const link: HTMLAnchorElement = document.createElement('a');
      const objectUrl = window.URL.createObjectURL(blob);

      // Use a temporary link to preserve the generated file name.
      try {
        link.download = getDocumentName(option);
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
    let componentMounted = true;

    void Promise.all(
      SCREENSHOT_FORMATS.map(async (format) => ({
        available: await isDownloadAvailable(getDocumentUrl({ doc: DocType.Landscape, format })),
        format,
      }))
    )
      .then((results) => {
        if (componentMounted) {
          setAvailableScreenshotFormats(
            new Set(results.filter((result) => result.available).map((result) => result.format))
          );
        }
      })
      .catch(() => {
        if (componentMounted) {
          setAvailableScreenshotFormats(new Set<Format>());
        }
      });

    onCleanup(() => {
      componentMounted = false;
    });
  });

  return (
    <div ref={setRef} class="ms-2 position-relative">
      <button
        type="button"
        class={`btn btn-md p-0 rounded-0 lh-1 ${styles.btn}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
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
          <Show when={availableLandscapeDownloads().length > 0}>
            <li>
              <div class={`text-uppercase text-center fw-semibold p-2 ${styles.dropdownHeader}`}>Landscape</div>
            </li>
            <For each={availableLandscapeDownloads()}>
              {(option) => (
                <DownloadMenuItem
                  disabled={downloadingFile() !== undefined}
                  downloading={isDownloading(option)}
                  onDownload={() => void downloadFile(option)}
                  option={option}
                />
              )}
            </For>
          </Show>
          <li>
            <div class={`text-uppercase text-center fw-semibold p-2 ${styles.dropdownHeader}`}>Data files</div>
          </li>
          <For each={DATA_DOWNLOAD_OPTIONS}>
            {(option) => (
              <DownloadMenuItem
                disabled={downloadingFile() !== undefined}
                downloading={isDownloading(option)}
                onDownload={() => void downloadFile(option)}
                option={option}
              />
            )}
          </For>
        </ul>
      </div>
    </div>
  );
};

export default DownloadDropdown;

// Reuse identical markup and pending behavior for every download option.
const DownloadMenuItem = (props: DownloadMenuItemProps) => (
  <li>
    <button
      class="dropdown-item py-3 border-top"
      disabled={props.disabled}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        props.onDownload();
      }}
      aria-label={`Download ${props.option.doc} in ${props.option.format.toUpperCase()} format`}
    >
      <div class="d-flex flex-row align-items-start">
        <div class="me-3 position-relative">
          <Show when={props.downloading}>
            <div class={`position-absolute ${styles.spinner}`}>
              <div class="spinner-border text-secondary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
          </Show>
          <SVGIcon class={styles.icon} kind={FORMAT_CONFIG[props.option.format].icon} />
        </div>
        <div class={styles.contentBtn}>
          <div class="fw-semibold mb-2">{getDocumentName(props.option)}</div>
          <div class={`text-wrap text-muted fst-italic ${styles.legend}`}>{props.option.description}</div>
        </div>
      </div>
    </button>
  </li>
);

const getDocumentName = (option: Pick<DownloadOption, 'doc' | 'format'>) => `${option.doc}.${option.format}`;

const getDocumentUrl = (option: Pick<DownloadOption, 'doc' | 'format'>) =>
  import.meta.env.MODE === 'development'
    ? `../../static/docs/${getDocumentName(option)}`
    : `./docs/${getDocumentName(option)}`;
