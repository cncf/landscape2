import { createTextElement } from 'common/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../../test-utils/fixtures';
import { renderWithExploreStores } from '../../../../test-utils/render';
import { ClassifyOption, SortDirection, SortOption } from '../../../../types';
import goToElement from '../../../../utils/goToElement';
import CardCategory from '..';

vi.mock('../../../../utils/goToElement', () => ({ default: vi.fn() }));
vi.mock('../Content', () => ({ default: () => createTextElement('Card content') }));

// The second "о" of "adоpter" is Cyrillic (U+043E), as in the OSPO landscape
const NON_ASCII_SUBCATEGORY = 'OSPO Adоpter';

const goToElementMock = vi.mocked(goToElement);

describe('CardCategory', () => {
  beforeEach(() => {
    window.baseDS = createBaseData({
      categories: [
        {
          name: 'OSPO Adopter',
          normalized_name: 'ospo-adopter',
          subcategories: [
            { name: 'First', normalized_name: 'first' },
            { name: 'Second', normalized_name: 'second' },
            { name: NON_ASCII_SUBCATEGORY, normalized_name: 'ospo-adоpter' },
          ],
        },
      ],
      maturity_options: [
        { name: 'Early Stage', normalized_name: 'early-stage' },
        { name: 'Graduated', normalized_name: 'graduated' },
      ],
      tag_options: [
        { name: 'a--b', normalized_name: 'a-b' },
        { name: 'security', normalized_name: 'security' },
      ],
    });
  });

  afterEach(() => {
    goToElementMock.mockReset();
  });

  it.each([
    ['an ASCII', '#ospo-adopter--second', 'ospo-adopter--second'],
    ['a percent-encoded non-ASCII', '#ospo-adopter--ospo-ad%D0%BEpter', 'ospo-adopter--ospo-adоpter'],
  ])('scrolls to the section of %s hash', async (_, hash, sectionId) => {
    // Render the Card view at the section hash, encoded as the browser gives it
    renderWithExploreStores(
      () => (
        <CardCategory
          initialIsVisible
          classify={ClassifyOption.Category}
          sorted={SortOption.Name}
          direction={SortDirection.Asc}
          data={{}}
          menu={{ 'OSPO Adopter': ['First', 'Second', NON_ASCII_SUBCATEGORY] }}
        />
      ),
      { url: `/${hash}` }
    );

    // Check the section is scrolled into view
    await vi.waitFor(() => expect(goToElementMock).toHaveBeenCalledWith(`card_${sectionId}`));
  });

  it('does not scroll when the hash names the first section on the page', async () => {
    vi.useFakeTimers();

    try {
      // Render the Card view at the hash of the first section
      renderWithExploreStores(
        () => (
          <CardCategory
            initialIsVisible
            classify={ClassifyOption.Category}
            sorted={SortOption.Name}
            direction={SortDirection.Asc}
            data={{}}
            menu={{ 'OSPO Adopter': ['First', 'Second'] }}
          />
        ),
        { url: '/#ospo-adopter--first' }
      );

      // Advance past the scroll delay and check no scroll happens
      await vi.advanceTimersByTimeAsync(150);
      expect(goToElementMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('scrolls to the first anchored section when an unanchored section sorts ahead of it', async () => {
    // Render the Card view with an unanchored section ahead of the first anchored one
    renderWithExploreStores(
      () => (
        <CardCategory
          initialIsVisible
          classify={ClassifyOption.Category}
          sorted={SortOption.Name}
          direction={SortDirection.Asc}
          data={{}}
          menu={{
            'A Unknown': ['Unanchored'],
            'OSPO Adopter': ['First', 'Second'],
          }}
        />
      ),
      { url: '/#ospo-adopter--first' }
    );

    // Check the first anchored section is scrolled into view because it is not first on the page
    await vi.waitFor(() => expect(goToElementMock).toHaveBeenCalledWith('card_ospo-adopter--first'));
  });

  it('scrolls to a declared section listed after an undeclared subcategory', async () => {
    // Render the Card view with an undeclared subcategory of a declared category
    renderWithExploreStores(
      () => (
        <CardCategory
          initialIsVisible
          classify={ClassifyOption.Category}
          sorted={SortOption.Name}
          direction={SortDirection.Asc}
          data={{}}
          menu={{ 'OSPO Adopter': ['A Undeclared', 'First', 'Second'] }}
        />
      ),
      { url: '/#ospo-adopter--first' }
    );

    // Check the declared section after the undeclared one is scrolled into view
    await vi.waitFor(() => expect(goToElementMock).toHaveBeenCalledWith('card_ospo-adopter--first'));
  });

  it('scrolls to an undeclared subcategory hash directly', async () => {
    // Render the Card view at the fallback hash of an undeclared subcategory
    renderWithExploreStores(
      () => (
        <CardCategory
          initialIsVisible
          classify={ClassifyOption.Category}
          sorted={SortOption.Name}
          direction={SortDirection.Asc}
          data={{}}
          menu={{ 'OSPO Adopter': ['First', 'AI SIG'] }}
        />
      ),
      { url: '/#ospo-adopter--ai-sig' }
    );

    // Check the undeclared section is scrolled into view
    await vi.waitFor(() => expect(goToElementMock).toHaveBeenCalledWith('card_ospo-adopter--ai-sig'));
  });

  it.each([
    [
      ClassifyOption.Maturity,
      { Maturity: ['Graduated', 'Early Stage', 'undefined'] },
      '#maturity--early-stage',
      'maturity--early-stage',
    ],
    [ClassifyOption.Maturity, { Maturity: ['Graduated', 'undefined'] }, '#maturity--undefined', 'maturity--undefined'],
    [ClassifyOption.TAG, { Tag: ['security', 'a--b', 'undefined'] }, '#tag--a-b', 'tag--a-b'],
  ])('scrolls to a %s section hash (%s)', async (classify, menu, hash, sectionId) => {
    // Render the classified Card view at a non-first normalized section hash
    renderWithExploreStores(
      () => (
        <CardCategory
          initialIsVisible
          classify={classify}
          sorted={SortOption.Name}
          direction={SortDirection.Asc}
          data={{}}
          menu={menu}
        />
      ),
      { url: `/${hash}` }
    );

    // Check the normalized classification section is scrolled into view
    await vi.waitFor(() => expect(goToElementMock).toHaveBeenCalledWith(`card_${sectionId}`));
  });

  it('cancels the pending scroll timer when unmounted', async () => {
    vi.useFakeTimers();

    try {
      // Mount with a non-first section hash and unmount before the delay elapses
      const { unmount } = renderWithExploreStores(
        () => (
          <CardCategory
            initialIsVisible
            classify={ClassifyOption.Category}
            sorted={SortOption.Name}
            direction={SortDirection.Asc}
            data={{}}
            menu={{ 'OSPO Adopter': ['First', 'Second'] }}
          />
        ),
        { url: '/#ospo-adopter--second' }
      );
      unmount();

      // Advance timers and check no scroll happens after unmount
      await vi.advanceTimersByTimeAsync(150);
      expect(goToElementMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives the content full width only when no menu entry resolves to an anchor', () => {
    // Render the Card view with only unanchored sections
    const empty = renderWithExploreStores(
      () => (
        <CardCategory
          initialIsVisible
          classify={ClassifyOption.Category}
          sorted={SortOption.Name}
          direction={SortDirection.Asc}
          data={{}}
          menu={{ 'A Unknown': ['Unknown Sub'] }}
        />
      ),
      { url: '/' }
    );

    // Check the menu is omitted and the content column spans the full width
    const emptyLayout = empty.container.firstElementChild as HTMLElement;
    expect(emptyLayout.children).toHaveLength(1);
    expect(emptyLayout.firstElementChild).toHaveClass('w-100');
    empty.unmount();

    // Render the Card view with a resolvable menu entry
    const populated = renderWithExploreStores(
      () => (
        <CardCategory
          initialIsVisible
          classify={ClassifyOption.Category}
          sorted={SortOption.Name}
          direction={SortDirection.Asc}
          data={{}}
          menu={{ 'OSPO Adopter': ['First'] }}
        />
      ),
      { url: '/' }
    );

    // Check the menu is rendered alongside the non-full-width content column
    const populatedLayout = populated.container.firstElementChild as HTMLElement;
    expect(populatedLayout.children).toHaveLength(2);
    expect(populatedLayout.children[1]).not.toHaveClass('w-100');
  });
});
