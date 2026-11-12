import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createDeferred, flushPromises } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import getDownloadBlob from '../../../utils/getDownloadBlob';
import isDownloadAvailable from '../../../utils/isDownloadAvailable';
import DownloadDropdown from '../DownloadDropdown';

vi.mock('../../../utils/getDownloadBlob');
vi.mock('../../../utils/isDownloadAvailable');

const DOWNLOAD_ERROR = 'Unable to download the file. Please try again.';

const getDownloadBlobMock = vi.mocked(getDownloadBlob);
const isDownloadAvailableMock = vi.mocked(isDownloadAvailable);

describe('DownloadDropdown', () => {
  beforeEach(() => {
    getDownloadBlobMock.mockReset();
    isDownloadAvailableMock.mockReset();
  });

  it('shows the available formats once a failed availability check is retried', async () => {
    const user = userEvent.setup();
    isDownloadAvailableMock.mockRejectedValueOnce(new TypeError('Network error')).mockResolvedValueOnce(false);

    // Render the dropdown while the first availability check fails
    await renderDropdown();
    await openDropdown(user);

    expect(screen.getByText('Unable to check every landscape download.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download landscape in PDF format' })).toBeNull();

    // Retry the availability check with every screenshot available
    isDownloadAvailableMock.mockResolvedValue(true);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await flushPromises();

    // Check both screenshot formats are offered
    expect(screen.getByRole('button', { name: 'Download landscape in PDF format' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download landscape in PNG format' })).toBeInTheDocument();
  });

  it('offers only the PDF screenshot when the PNG one is missing', async () => {
    // Setup a landscape with only the PDF screenshot available
    const user = userEvent.setup();
    isDownloadAvailableMock.mockImplementation((url: string) => Promise.resolve(url.endsWith('.pdf')));

    // Render and open the dropdown
    await renderDropdown();
    await openDropdown(user);

    // Check only the PDF screenshot is offered
    expect(screen.getByText('Landscape')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download landscape in PDF format' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download landscape in PNG format' })).toBeNull();
  });

  it('omits the Landscape section when no screenshot format is available', async () => {
    // Setup a landscape with no screenshot available
    const user = userEvent.setup();
    isDownloadAvailableMock.mockResolvedValue(false);

    // Render and open the dropdown
    await renderDropdown();
    await openDropdown(user);

    // Check only the data files are offered
    expect(screen.queryByText('Landscape')).toBeNull();
    expect(screen.getByText('Data files')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download items in CSV format' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download projects in CSV format' })).toBeInTheDocument();
  });

  it('disables duplicate downloads and cleans up the generated link', async () => {
    // Setup a pending download and the object URL API
    const user = userEvent.setup();
    const blob = new Blob(['items'], { type: 'text/csv' });
    const download = createDeferred<Blob>();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURL = vi.fn(() => 'blob:items');
    const revokeObjectURL = vi.fn();
    isDownloadAvailableMock.mockResolvedValue(false);
    getDownloadBlobMock.mockReturnValue(download.promise);
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      }
    );

    // Render the dropdown and open it
    await renderDropdown();
    await openDropdown(user);

    // Start a download and try to start another one while it is pending
    const itemsButton = screen.getByRole('button', { name: 'Download items in CSV format' });
    const projectsButton = screen.getByRole('button', { name: 'Download projects in CSV format' });
    await user.click(itemsButton);
    await user.click(projectsButton);

    expect(getDownloadBlobMock).toHaveBeenCalledTimes(1);
    expect(getDownloadBlobMock).toHaveBeenCalledWith(expect.objectContaining({ accept: 'text/csv' }));
    expect(projectsButton).toBeDisabled();

    // Resolve the pending download
    download.resolve(blob);
    await flushPromises();

    // Check the file was saved through a temporary link that is cleaned up, and the dropdown closed
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:items');
    expect(document.querySelector('a[download="items.csv"]')).toBeNull();
    expect(projectsButton).toBeEnabled();
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a recoverable download error', async () => {
    const user = userEvent.setup();
    isDownloadAvailableMock.mockResolvedValue(false);
    getDownloadBlobMock.mockRejectedValue(new TypeError('Network error'));

    // Open the dropdown and start a download that fails
    await renderDropdown();
    await openDropdown(user);
    await user.click(screen.getByRole('button', { name: 'Download items in CSV format' }));
    await flushPromises();

    // Check the error is shown and the download can be tried again
    expect(screen.getByText(DOWNLOAD_ERROR)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download items in CSV format' })).toBeEnabled();
  });

  it('clears the download error when the dropdown is opened again', async () => {
    const user = userEvent.setup();
    isDownloadAvailableMock.mockResolvedValue(false);
    getDownloadBlobMock.mockRejectedValue(new TypeError('Network error'));

    // Fail a download
    await renderDropdown();
    await openDropdown(user);
    await user.click(screen.getByRole('button', { name: 'Download items in CSV format' }));
    await flushPromises();
    expect(screen.getByText(DOWNLOAD_ERROR)).toBeInTheDocument();

    // Close and reopen the dropdown
    await user.click(toggleButton());
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false');
    await openDropdown(user);

    // Check the error is gone
    expect(screen.queryByText(DOWNLOAD_ERROR)).toBeNull();
  });

  it('closes when clicking outside of it', async () => {
    const user = userEvent.setup();
    isDownloadAvailableMock.mockResolvedValue(false);

    // Open the dropdown next to an outside element
    await renderDropdown(true);
    await openDropdown(user);
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true');

    // Click outside of it
    await user.click(screen.getByRole('button', { name: 'Outside' }));

    // Check the dropdown is closed
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(toggleButton().getAttribute('aria-controls')!)).not.toHaveClass('show');
  });
});

// Helpers.

/** Opens the dropdown through its toggle button and checks it is shown. */
const openDropdown = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(toggleButton());
  expect(toggleButton()).toHaveAttribute('aria-expanded', 'true');
  expect(document.getElementById(toggleButton().getAttribute('aria-controls')!)).toHaveClass('show');
};

/** Renders the dropdown (next to an outside button when asked) and waits for the availability checks. */
const renderDropdown = async (withOutsideButton = false) => {
  render(() => (
    <>
      {withOutsideButton && <button type="button">Outside</button>}
      <DownloadDropdown />
    </>
  ));
  await flushPromises();
};

/** Returns the button that toggles the dropdown. */
const toggleButton = (): HTMLElement => screen.getByRole('button', { name: 'Download files' });
