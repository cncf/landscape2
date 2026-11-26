import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createItem, createTextElement } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import itemsDataGetter, { LogosPreviewOptions } from '../../../utils/itemsDataGetter';
import { FullDataProvider } from '../../stores/fullData';
import Logos from '..';

/** Graduated items: two share a logo, and one is a non-public organization. */
const GRADUATED_ITEMS = [
  createItem({ id: 'zeta', logo: 'logos/zeta.svg', maturity: 'graduated', name: 'Zeta' }),
  createItem({ id: 'alpha', logo: 'logos/shared.svg', maturity: 'graduated', name: 'Alpha' }),
  createItem({ id: 'beta', logo: 'logos/shared.svg', maturity: 'graduated', name: 'Beta' }),
  createItem({
    id: 'non-public',
    logo: 'logos/non-public.svg',
    maturity: 'graduated',
    name: 'Non-Public Organization: Acme',
  }),
];

vi.mock('../../navigation/Footer', () => ({ default: () => createTextElement('Footer') }));

describe('Logos', () => {
  beforeEach(() => {
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('ready');
    vi.spyOn(itemsDataGetter, 'prepareLogosOptions').mockReturnValue([
      {
        id: LogosPreviewOptions.Maturity,
        name: 'maturity',
        options: [{ name: 'Graduated', value: 'graduated' }],
      },
    ]);
    vi.spyOn(itemsDataGetter, 'getItemsByMaturity').mockReturnValue(GRADUATED_ITEMS);
  });

  it('shows one logo per image, sorted by name', async () => {
    const user = userEvent.setup();
    renderLogos();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Options' }), 'graduated');

    expect(logoNames()).toEqual(['Alpha logo', 'Non-Public Organization: Acme logo', 'Zeta logo']);
  });

  it('hides the non-public organizations when the switch is on', async () => {
    const user = userEvent.setup();
    renderLogos();

    // Show the graduated items
    await user.selectOptions(screen.getByRole('combobox', { name: 'Options' }), 'graduated');
    expect(logoNames()).toContain('Non-Public Organization: Acme logo');

    // Hide the non-public organizations
    await user.click(screen.getByRole('switch', { name: 'Hide non-public organizations' }));
    expect(logoNames()).toEqual(['Alpha logo', 'Zeta logo']);

    // Show them again
    await user.click(screen.getByRole('switch', { name: 'Hide non-public organizations' }));
    expect(logoNames()).toContain('Non-Public Organization: Acme logo');
  });
});

// Helpers.

/** Returns the alt text of each logo shown, in order. */
const logoNames = (): string[] =>
  screen.getAllByRole('listitem').map((item) => item.querySelector('img')!.getAttribute('alt')!);

/** Renders the Logos page with the full data store. */
const renderLogos = () =>
  render(() => (
    <FullDataProvider>
      <Logos />
    </FullDataProvider>
  ));
