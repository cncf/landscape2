import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CollapsableText } from '../CollapsableText';

describe('CollapsableText', () => {
  it('collapses a long text behind a "Show more" button', async () => {
    // Setup
    const user = userEvent.setup();
    stubOffsetHeight(200);
    render(() => <CollapsableText text="A long summary" />);
    const text = screen.getByText('A long summary');

    // Check
    expect(text).toHaveStyle({ 'max-height': '76px' });

    // Run
    await user.click(screen.getByRole('button', { name: 'Show more' }));

    // Check
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
    expect(text.style.maxHeight).toBe('');
  });

  it('honours maxLinesNumber', () => {
    stubOffsetHeight(50);

    render(() => <CollapsableText text="A long summary" maxLinesNumber={2} />);

    expect(screen.getByText('A long summary')).toHaveStyle({ 'max-height': '38px' });
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('shows a short text in full without a button', () => {
    stubOffsetHeight(40);

    render(() => <CollapsableText text="A short summary" />);

    expect(screen.getByText('A short summary').style.maxHeight).toBe('');
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('renders the summary links', () => {
    stubOffsetHeight(40);

    render(() => <CollapsableText text="See https://example.com now" />);

    expect(screen.getByRole('link', { name: 'https://example.com' })).toHaveAttribute('href', 'https://example.com');
  });
});

// Helpers.

/** Makes every element report the given rendered height, which jsdom leaves at 0. */
const stubOffsetHeight = (height: number) => {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(height);
};
