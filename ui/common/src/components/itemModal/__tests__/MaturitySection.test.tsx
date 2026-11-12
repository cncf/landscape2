import { render, screen } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';

import { createItem } from '../../../test-utils';
import type { Item } from '../../../types/datasets';
import { MaturitySection } from '../MaturitySection';
import type { SectionVariant } from '../styles';

const LEVELS = ['Sandbox', 'Incubating', 'Graduated'];
const VARIANTS: SectionVariant[] = ['desktop', 'mobile'];

describe('MaturitySection', () => {
  describe.each(VARIANTS)('%s variant', (variant) => {
    it.each([
      ['sandbox', { accepted_at: '2019-01-01' }, ['Sandbox']],
      ['incubating', { accepted_at: '2019-01-01', incubating_at: '2020-01-01' }, ['Sandbox', 'Incubating']],
      [
        'graduated',
        { accepted_at: '2019-01-01', graduated_at: '2021-01-01', incubating_at: '2020-01-01' },
        ['Sandbox', 'Incubating', 'Graduated'],
      ],
    ])('highlights the levels reached by a %s project', (maturity, dates: Partial<Item>, activeLevels) => {
      renderSection(createItem({ ...dates, maturity }), variant);

      expect(screen.getByRole('heading', { name: 'Maturity' })).toBeInTheDocument();
      expect(getActiveLevels()).toEqual(activeLevels);
    });

    it('shows the level dates and a dash for missing ones', () => {
      renderSection(
        createItem({ accepted_at: '2019-01-01', maturity: 'incubating', incubating_at: '2020-01-01' }),
        variant
      );

      expect(LEVELS.map((level) => getBadge(level).textContent)).toEqual(['2019-01-01', '2020-01-01', '-']);
    });

    it('shows a dash for the sandbox date when the project was accepted as incubating', () => {
      renderSection(
        createItem({ accepted_at: '2020-01-01', maturity: 'incubating', incubating_at: '2020-01-01' }),
        variant
      );

      expect(getBadge('Sandbox')).toHaveTextContent('-');
      expect(getBadge('Incubating')).toHaveTextContent('2020-01-01');
    });

    it('hides the section for archived projects', () => {
      renderSection(createItem({ accepted_at: '2019-01-01', maturity: 'archived' }), variant);

      expect(screen.queryByRole('heading', { name: 'Maturity' })).not.toBeInTheDocument();
    });

    it('hides the section for projects without maturity dates', () => {
      renderSection(createItem({ maturity: 'graduated' }), variant);

      expect(screen.queryByRole('heading', { name: 'Maturity' })).not.toBeInTheDocument();
    });

    it('hides the section for items without maturity', () => {
      renderSection(createItem({ accepted_at: '2019-01-01' }), variant);

      expect(screen.queryByRole('heading', { name: 'Maturity' })).not.toBeInTheDocument();
    });
  });
});

// Helpers.

/**
 * Returns the levels whose badge is highlighted. The sandbox badge is always highlighted, so a badge is
 * highlighted when it has the same classes.
 */
const getActiveLevels = (): string[] => {
  const activeClasses = [...getBadge('Sandbox').classList].sort().join(' ');
  return LEVELS.filter((level) => [...getBadge(level).classList].sort().join(' ') === activeClasses);
};

/** Returns the badge of a maturity level, which precedes its legend. */
const getBadge = (level: string): HTMLElement => screen.getByText(level).previousElementSibling as HTMLElement;

/** Renders the maturity section of an item in the given variant. */
const renderSection = (item: Item, variant: SectionVariant): ReturnType<typeof render> =>
  render(() => <MaturitySection item={item} variant={variant} />);
