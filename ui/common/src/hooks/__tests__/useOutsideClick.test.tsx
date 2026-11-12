import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { useOutsideClick } from '../useOutsideClick';

describe('useOutsideClick', () => {
  it('calls the handler on a mousedown outside the refs', async () => {
    const user = userEvent.setup();
    const onClickOutside = vi.fn();
    render(() => <OutsideClickFixture onClickOutside={onClickOutside} />);

    await user.click(screen.getByRole('button', { name: 'Outside' }));

    expect(onClickOutside).toHaveBeenCalledTimes(1);
    expect(onClickOutside).toHaveBeenCalledWith(expect.any(MouseEvent));
  });

  it('ignores a mousedown inside a ref or its descendants', async () => {
    const user = userEvent.setup();
    const onClickOutside = vi.fn();
    render(() => <OutsideClickFixture onClickOutside={onClickOutside} />);

    await user.click(screen.getByRole('dialog'));
    await user.click(screen.getByRole('button', { name: 'Inside' }));

    expect(onClickOutside).not.toHaveBeenCalled();
  });

  it('ignores a mousedown on an excluded element or its descendants', async () => {
    const user = userEvent.setup();
    const onClickOutside = vi.fn();
    render(() => <OutsideClickFixture onClickOutside={onClickOutside} />);

    await user.click(screen.getByRole('banner'));
    await user.click(screen.getByRole('link', { name: 'Event details' }));

    expect(onClickOutside).not.toHaveBeenCalled();
  });

  it('stops calling the handler once it is disabled', async () => {
    const user = userEvent.setup();
    const onClickOutside = vi.fn();
    const [enabled, setEnabled] = createSignal(true);
    render(() => <OutsideClickFixture enabled={enabled()} onClickOutside={onClickOutside} />);

    // Click outside while enabled
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(onClickOutside).toHaveBeenCalledTimes(1);

    // Disable it and click outside again
    setEnabled(false);
    await user.click(screen.getByRole('button', { name: 'Outside' }));

    expect(onClickOutside).toHaveBeenCalledTimes(1);
  });

  it('removes the listener when disposed', async () => {
    const user = userEvent.setup();
    const onClickOutside = vi.fn();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);
    const { unmount } = render(() => <OutsideClickFixture onClickOutside={onClickOutside} />);

    // Dispose the owner and click outside
    unmount();
    await user.click(outsideButton);

    // Check the handler is not called and the listener is gone
    expect(onClickOutside).not.toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    outsideButton.remove();
  });
});

/** Renders a dialog ref, an excluded banner and an outside button wired to the hook. */
const OutsideClickFixture = (props: { enabled?: boolean; onClickOutside: (e: MouseEvent) => void }) => {
  const [ref, setRef] = createSignal<HTMLElement>();
  useOutsideClick(
    [ref],
    ['excluded-banner'],
    () => props.enabled ?? true,
    (e) => props.onClickOutside(e)
  );

  return (
    <>
      <header id="excluded-banner">
        <a href="#event">Event details</a>
      </header>
      <div ref={setRef} role="dialog">
        <button type="button">Inside</button>
      </div>
      <button type="button">Outside</button>
    </>
  );
};
