import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Pagination, { getPaginationOptions } from '../Pagination';

describe('getPaginationOptions', () => {
  it.each([
    [1, 1, [1]],
    [1, 5, [1, 2, '...', 5]],
    [3, 5, [1, 2, 3, 4, 5]],
    [5, 10, [1, '...', 4, 5, 6, '...', 10]],
    [10, 10, [1, '...', 9, 10]],
  ])('returns the options of page %i of %i', (currentPage, pageCount, expected) => {
    expect(getPaginationOptions(currentPage, pageCount)).toEqual(expected);
  });
});

describe('Pagination', () => {
  it('marks Next as disabled on the last page', () => {
    renderPagination(5);

    const next = screen.getByText('Next').closest('button')!;
    expect(next).toBeDisabled();
    expect(next.closest('li')).toHaveClass('disabled');
  });

  it('marks Previous as disabled on the first page and leaves Next enabled', () => {
    renderPagination(1);

    expect(screen.getByText('Previous').closest('li')).toHaveClass('disabled');
    expect(screen.getByText('Next').closest('li')).not.toHaveClass('disabled');
  });

  it.each([
    [1, 5],
    [3, 5],
    [5, 5],
  ])('names the Previous and Next buttons after their action on page %i of %i', (active) => {
    renderPagination(active);

    expect(screen.getByRole('button', { name: 'Go to previous page' })).toHaveTextContent('Previous');
    expect(screen.getByRole('button', { name: 'Go to next page' })).toHaveTextContent('Next');
    expect(screen.queryByRole('button', { name: 'Open page 0' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open page 6' })).not.toBeInTheDocument();
  });

  it('opens the previous and next pages', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPagination(3);

    // Go to the previous page, then to the next one
    await user.click(screen.getByRole('button', { name: 'Go to previous page' }));
    await user.click(screen.getByRole('button', { name: 'Go to next page' }));

    // Verify both pages were reported
    expect(onChange.mock.calls).toEqual([[2], [4]]);
  });

  it('does not call onChange when the active page is clicked', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPagination(3);

    // Click the active page, then another one
    await user.click(screen.getByRole('button', { name: 'Open page 3' }));
    await user.click(screen.getByRole('button', { name: 'Open page 5' }));

    // Verify only the other page was reported
    expect(onChange).toHaveBeenCalledExactlyOnceWith(5);
  });
});

// Helpers.

/** Renders five pages of ten results with the given page active, returning the change callback mock. */
const renderPagination = (active: number) => {
  const onChange = vi.fn();
  render(() => <Pagination initialLimit={10} initialTotal={50} active={active} onChange={onChange} />);
  return { onChange };
};
