import { screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithRouter } from '../../../test-utils/render';
import type { ToCTitle } from '../../../types';
import ToC from '../ToC';

/** Table of contents with a category and two subcategories. */
const TOC: ToCTitle[] = [
  {
    id: 'category',
    options: [
      { id: 'category--sub-1', title: 'Sub 1' },
      { id: 'category--sub-2', title: 'Sub 2' },
    ],
    title: 'Category',
  },
];

describe('ToC', () => {
  it('keeps the ids unique when the mobile and the desktop copies are rendered together', () => {
    const { container } = renderWithRouter(() => (
      <>
        <ToC idPrefix="mobile" toc={TOC} sticky={false} updateActiveTitle={vi.fn()} />
        <ToC idPrefix="desktop" toc={TOC} sticky updateActiveTitle={vi.fn()} />
      </>
    ));

    // The styles injected in the document head carry ids too, so only the rendered ToCs are checked
    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.getElementById('desktop_menu')).toBeInTheDocument();
    expect(document.getElementById('desktop_btn_category--sub-1')).toHaveTextContent('Sub 1');
  });

  it('marks the option of the current hash as active and reports the clicked option', async () => {
    const updateActiveTitle = vi.fn();
    const user = userEvent.setup();

    // Render the ToC with the second subcategory in the hash
    renderWithRouter(() => <ToC idPrefix="desktop" toc={TOC} sticky updateActiveTitle={updateActiveTitle} />, {
      url: '/guide#category--sub-2',
    });
    const activeOption = screen.getByRole('button', { name: 'Open Sub 2 section' });
    const inactiveOption = screen.getByRole('button', { name: 'Open Sub 1 section' });
    expect(activeOption.className).not.toBe(inactiveOption.className);

    // Click the first subcategory and verify its id is reported
    await user.click(inactiveOption);
    expect(updateActiveTitle).toHaveBeenCalledExactlyOnceWith('category--sub-1');
  });
});
