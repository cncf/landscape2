import { render, screen } from '@solidjs/testing-library';
import { setViewportWidth } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Title from '../Title';

/** Height of the title container, in pixels. */
const CONTAINER_HEIGHT = 100;

/** Title text. */
const TEXT = 'Which project is a graduated one?';

/** Viewport width where the text fits at its full size. */
const WIDE_VIEWPORT = 1000;

describe('Title', () => {
  beforeEach(() => {
    setViewportWidth(WIDE_VIEWPORT);
    mockLayout();
  });

  it('keeps the full size when the text fits', () => {
    render(() => <Title content={TEXT} />);

    expect(textFontSize()).toBe('100%');
  });

  it('restores the size when the window widens after a shrink', () => {
    // Narrow the window until the text only fits at half its size
    render(() => <Title content={TEXT} />);
    setViewportWidth(WIDE_VIEWPORT / 2);
    expect(textFontSize()).toBe('50%');

    // Widen it again and verify the text gets back its full size
    setViewportWidth(WIDE_VIEWPORT);
    expect(textFontSize()).toBe('100%');
  });

  it('never shrinks the text below 40%', () => {
    setViewportWidth(WIDE_VIEWPORT / 10);

    render(() => <Title content={TEXT} />);

    expect(textFontSize()).toBe('40%');
  });
});

// Helpers.

/**
 * Mocks the layout jsdom lacks: the container is `CONTAINER_HEIGHT` tall, and the
 * text, the element with an inline font size, grows with its font size and as the
 * viewport narrows. At `WIDE_VIEWPORT` the text fits up to a 100% font size.
 */
const mockLayout = () => {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    const fontSize = parseFloat(this.style.fontSize);
    if (Number.isNaN(fontSize)) {
      return CONTAINER_HEIGHT;
    }
    return (fontSize * WIDE_VIEWPORT) / window.innerWidth;
  });
};

/** Returns the inline font size of the title text. */
const textFontSize = () => screen.getByText(TEXT).style.fontSize;
