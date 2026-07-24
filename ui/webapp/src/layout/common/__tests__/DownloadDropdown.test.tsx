import { render } from 'solid-js/web';

import getDownloadBlob from '../../../utils/getDownloadBlob';
import isDownloadAvailable from '../../../utils/isDownloadAvailable';
import DownloadDropdown from '../DownloadDropdown';

jest.mock('../../../utils/getDownloadBlob');
jest.mock('../../../utils/isDownloadAvailable');
jest.mock('../../../data', () => ({ BANNER_ID: 'banner' }));
jest.mock('../../../utils/downloadDocument', () => ({
  getDownloadDocumentName: ({ doc, format }: { doc: string; format: string }) => `${doc}.${format}`,
  getDownloadDocumentUrl: ({ doc, format }: { doc: string; format: string }) => `./docs/${doc}.${format}`,
}));

const getDownloadBlobMock = getDownloadBlob as jest.MockedFunction<typeof getDownloadBlob>;
const isDownloadAvailableMock = isDownloadAvailable as jest.MockedFunction<typeof isDownloadAvailable>;

describe('DownloadDropdown', () => {
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;
  let container: HTMLDivElement;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    dispose = undefined;
    getDownloadBlobMock.mockReset();
    isDownloadAvailableMock.mockReset();
  });

  afterEach(() => {
    dispose?.();
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    document.body.replaceChildren();
    jest.restoreAllMocks();
  });

  it('should show available formats and recover from a failed availability check', async () => {
    isDownloadAvailableMock.mockRejectedValueOnce(new TypeError('Network error')).mockResolvedValueOnce(false);
    dispose = render(() => <DownloadDropdown />, container);

    await flushPromises();
    expect(container.textContent).toContain('Unable to check every landscape download.');
    expect(getButton(container, 'Download landscape in PDF format')).toBeNull();

    isDownloadAvailableMock.mockResolvedValue(true);
    getButtonByText(container, 'Try again')!.click();
    await flushPromises();

    expect(getButton(container, 'Download landscape in PDF format')).not.toBeNull();
    expect(getButton(container, 'Download landscape in PNG format')).not.toBeNull();
  });

  it('should disable duplicate downloads and clean up a generated link', async () => {
    const blob = new Blob(['items'], { type: 'text/csv' });
    const download = createDeferredPromise<Blob>();
    const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation();

    isDownloadAvailableMock.mockResolvedValue(false);
    getDownloadBlobMock.mockReturnValue(download.promise);
    window.URL.createObjectURL = jest.fn(() => 'blob:items');
    window.URL.revokeObjectURL = jest.fn();
    dispose = render(() => <DownloadDropdown />, container);
    await flushPromises();

    getButton(container, 'Download files')!.click();
    const itemsButton = getButton(container, 'Download items in CSV format')!;
    const projectsButton = getButton(container, 'Download projects in CSV format')!;
    itemsButton.click();
    projectsButton.click();

    expect(getDownloadBlobMock).toHaveBeenCalledTimes(1);
    expect(projectsButton.disabled).toBe(true);

    download.resolve(blob);
    await flushPromises();

    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:items');
    expect(document.querySelector('a[download="items.csv"]')).toBeNull();
    expect(projectsButton.disabled).toBe(false);
  });

  it('should omit the landscape section when no screenshot formats are available', async () => {
    isDownloadAvailableMock.mockResolvedValue(false);
    dispose = render(() => <DownloadDropdown />, container);
    await flushPromises();

    getButton(container, 'Download files')!.click();

    expect(getElementByText(container, 'Landscape')).toBeUndefined();
    expect(getElementByText(container, 'No landscape downloads available.')).toBeUndefined();
    expect(getElementByText(container, 'Data files')).not.toBeUndefined();
    expect(getButton(container, 'Download items in CSV format')).not.toBeNull();
    expect(getButton(container, 'Download projects in CSV format')).not.toBeNull();
  });

  it('should show a recoverable download error', async () => {
    isDownloadAvailableMock.mockResolvedValue(false);
    getDownloadBlobMock.mockRejectedValue(new TypeError('Network error'));
    dispose = render(() => <DownloadDropdown />, container);
    await flushPromises();

    getButton(container, 'Download items in CSV format')!.click();
    await flushPromises();

    expect(container.textContent).toContain('Unable to download the file. Please try again.');
    expect(getButton(container, 'Download items in CSV format')!.disabled).toBe(false);
  });
});

const createDeferredPromise = <Value,>() => {
  let resolvePromise!: (value: Value) => void;
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const getButton = (container: HTMLElement, label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

const getButtonByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === text);

const getElementByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll('*')).find((element) => element.textContent?.trim() === text);
