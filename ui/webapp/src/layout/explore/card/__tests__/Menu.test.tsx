import { screen } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../../test-utils/fixtures';
import { renderWithRouter } from '../../../../test-utils/render';
import Menu from '../Menu';

describe('Menu', () => {
  let landscape: HTMLElement;
  let footer: HTMLElement;
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    // Setup the page elements the sticky menu measures and a manual animation frame queue
    window.baseDS = createBaseData({
      categories: [
        {
          name: 'Category 1',
          normalized_name: 'category-1',
          subcategories: [{ name: 'Sub 1', normalized_name: 'sub-1' }],
        },
      ],
    });
    landscape = document.createElement('div');
    landscape.id = 'landscape';
    footer = document.createElement('footer');
    footer.setAttribute('role', 'contentinfo');
    document.body.append(landscape, footer);
    frames = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => frames.push(callback))
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    landscape.remove();
    footer.remove();
  });

  it('updates its height once per frame and only on its own element', () => {
    const { container } = renderWithRouter(() => <Menu menu={{ 'Category 1': ['Sub 1'] }} isVisible sticky />);
    const menu = container.firstElementChild as HTMLElement;

    // Scroll several times before the next frame
    landscape.dispatchEvent(new Event('scroll'));
    landscape.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));

    // Check the updates share one frame and the height is set on the menu
    expect(frames).toHaveLength(1);
    menu.style.removeProperty('--menu-max-height');
    frames[0](0);
    expect(menu.style.getPropertyValue('--menu-max-height')).not.toBe('');
    expect(document.documentElement.style.getPropertyValue('--menu-max-height')).toBe('');
    expect(screen.getByRole('button', { name: 'Sub 1' })).toBeInTheDocument();
  });

  it('cancels the pending frame and stops listening when unmounted', () => {
    const { unmount } = renderWithRouter(() => <Menu menu={{ 'Category 1': ['Sub 1'] }} isVisible sticky />);

    // Schedule an update and unmount
    landscape.dispatchEvent(new Event('scroll'));
    unmount();

    // Check the frame is cancelled and new events schedule nothing
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    landscape.dispatchEvent(new Event('scroll'));
    expect(frames).toHaveLength(1);
  });
});
