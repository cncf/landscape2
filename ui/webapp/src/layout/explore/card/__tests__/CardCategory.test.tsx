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
});
