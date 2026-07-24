import { SVGIcon, SVGIconKind, useOutsideClick } from 'common';
import { createSignal, createUniqueId, For, onCleanup, onMount, Show } from 'solid-js';

import { BANNER_ID } from '../../data';
import { getDownloadDocumentName, getDownloadDocumentUrl } from '../../utils/downloadDocument';
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

enum ScreenshotAvailabilityStatus {
  Checking = 'checking',
  Error = 'error',
  Ready = 'ready',
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
  const dropdownId = createUniqueId();
  const [availableScreenshotFormats, setAvailableScreenshotFormats] = createSignal<Set<Format>>(new Set());
  const [downloadError, setDownloadError] = createSignal<string>();
  const [downloadingFile, setDownloadingFile] = createSignal<DownloadOption>();
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [screenshotAvailabilityStatus, setScreenshotAvailabilityStatus] = createSignal<ScreenshotAvailabilityStatus>(
    ScreenshotAvailabilityStatus.Checking
  );
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  let componentMounted = false;
  useOutsideClick([ref], [BANNER_ID], visibleDropdown, () => setVisibleDropdown(false));

  // Keep each successfully generated screenshot format available independently.
  const availableLandscapeDownloads = () =>
    LANDSCAPE_DOWNLOAD_OPTIONS.filter((option) => availableScreenshotFormats().has(option.format));

  const shouldShowLandscapeDownloads = () =>
    screenshotAvailabilityStatus() !== ScreenshotAvailabilityStatus.Ready || availableLandscapeDownloads().length > 0;

  const checkScreenshotAvailability = async () => {
    setScreenshotAvailabilityStatus(ScreenshotAvailabilityStatus.Checking);
    const results = await Promise.all(
      SCREENSHOT_FORMATS.map(async (format) => {
        try {
          return {
            available: await isDownloadAvailable(getDownloadDocumentUrl({ doc: DocType.Landscape, format })),
            failed: false,
            format,
          };
        } catch {
          return { available: false, failed: true, format };
        }
      })
    );

    if (componentMounted) {
      setAvailableScreenshotFormats(
        new Set(results.filter((result) => result.available).map((result) => result.format))
      );
      setScreenshotAvailabilityStatus(
        results.some((result) => result.failed)
          ? ScreenshotAvailabilityStatus.Error
          : ScreenshotAvailabilityStatus.Ready
      );
    }
  };

  const downloadFile = async (option: DownloadOption) => {
    if (downloadingFile()) {
      return;
    }

    setDownloadError();
    setDownloadingFile(option);

    try {
      const formatConfig = FORMAT_CONFIG[option.format];
      const blob = await getDownloadBlob({
        blobType: formatConfig.blobType,
        contentType: formatConfig.contentType,
        responseAsBlob: formatConfig.responseAsBlob,
        url: getDownloadDocumentUrl(option),
      });
      const link: HTMLAnchorElement = document.createElement('a');
      const objectUrl = window.URL.createObjectURL(blob);

      // Use a temporary link to preserve the generated file name.
      try {
        link.download = getDownloadDocumentName(option);
        link.href = objectUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setVisibleDropdown(false);
      } finally {
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
      }
    } catch {
      setDownloadError('Unable to download the file. Please try again.');
    } finally {
      // Always clear the pending state, including when the file is missing.
      setDownloadingFile();
    }
  };

  const isDownloading = (option: DownloadOption) => {
    const currentDownload = downloadingFile();
    return currentDownload?.doc === option.doc && currentDownload.format === option.format;
  };

  onMount(() => {
    // Screenshot generation is optional, so only expose artifacts that exist.
    componentMounted = true;
    void checkScreenshotAvailability();

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
          const nextVisibleDropdown = !visibleDropdown();
          if (nextVisibleDropdown) {
            setDownloadError();
          }
          setVisibleDropdown(nextVisibleDropdown);
        }}
        aria-controls={dropdownId}
        aria-expanded={visibleDropdown()}
        aria-label="Download files"
      >
        <SVGIcon kind={SVGIconKind.Download} />
      </button>

      <div
        id={dropdownId}
        class={`dropdown-menu rounded-0 p-0 ${styles.dropdown}`}
        classList={{ show: visibleDropdown() }}
      >
        <div class={`d-block position-absolute ${styles.arrow}`} />
        <ul class={`m-0 p-0 ${styles.menuList}`}>
          <Show when={shouldShowLandscapeDownloads()}>
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
            <Show when={screenshotAvailabilityStatus() === ScreenshotAvailabilityStatus.Checking}>
              <li class="text-muted fst-italic px-3 py-2" role="status">
                Checking landscape downloads...
              </li>
            </Show>
            <Show when={screenshotAvailabilityStatus() === ScreenshotAvailabilityStatus.Error}>
              <li>
                <div class="alert alert-danger rounded-0 m-0 px-3 py-2" role="alert">
                  <div>Unable to check every landscape download.</div>
                  <button class="btn btn-link p-0" type="button" onClick={() => void checkScreenshotAvailability()}>
                    Try again
                  </button>
                </div>
              </li>
            </Show>
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
          <Show when={downloadError()}>
            <li>
              <div class="alert alert-danger rounded-0 m-0 px-3 py-2" role="alert">
                {downloadError()}
              </div>
            </li>
          </Show>
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
          <div class="fw-semibold mb-2">{getDownloadDocumentName(props.option)}</div>
          <div class={`text-wrap text-muted fst-italic ${styles.legend}`}>{props.option.description}</div>
        </div>
      </div>
    </button>
  </li>
);
