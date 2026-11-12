import { render, screen } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';

import { LanguagesStats } from '../LanguagesStats';

describe('LanguagesStats', () => {
  it('lists the languages by descending share', () => {
    render(() => <LanguagesStats initialLanguages={{ Go: 300, Rust: 500, TypeScript: 200 }} />);

    expect(getLegends()).toEqual(['Rust', 'Go', 'TypeScript']);
    expect(getValues()).toEqual(['50%', '30%', '20%']);
  });

  it('shows the 5 most used of 6 languages', () => {
    render(() => <LanguagesStats initialLanguages={{ A: 60, B: 50, C: 40, D: 30, E: 20, F: 10 }} />);

    expect(getLegends()).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('renders nothing when every language has zero bytes', () => {
    const { container } = render(() => <LanguagesStats initialLanguages={{ Go: 0, Rust: 0 }} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('formats a share that rounds to zero as <0.01%', () => {
    render(() => <LanguagesStats initialLanguages={{ Go: 1, Rust: 99999 }} />);

    expect(getValues()).toEqual(['100%', '<0.01%']);
  });
});

// Helpers.

/** Returns the language legends, in display order. */
const getLegends = (): string[] =>
  Array.from(document.querySelectorAll('[aria-description$="language percentage"]')).map((box) =>
    box.getAttribute('aria-description')!.replace(' language percentage', '')
  );

/** Returns the language percentages, in display order. */
const getValues = (): (string | null | undefined)[] =>
  Array.from(document.querySelectorAll('[aria-description$="language percentage"]')).map(
    (box) => box.firstElementChild?.firstElementChild?.textContent
  );
