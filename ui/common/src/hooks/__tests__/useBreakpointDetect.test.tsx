import { render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setViewportWidth } from '../../test-utils';
import { Breakpoint } from '../../types/types';

describe('useBreakpointDetect', () => {
  let useBreakpointDetect: typeof import('../useBreakpointDetect').useBreakpointDetect;

  beforeEach(async () => {
    // Load a fresh copy so the window size singleton starts from the current width
    vi.resetModules();
    setViewportWidth(1100);
    ({ useBreakpointDetect } = await import('../useBreakpointDetect'));
  });

  /** Renders the breakpoint returned by the freshly loaded hook. */
  const BreakpointProbe = () => {
    const { point } = useBreakpointDetect();
    return <span>{point()}</span>;
  };

  it('returns the breakpoint of the initial viewport width', () => {
    render(() => <BreakpointProbe />);

    expect(screen.getByText(Breakpoint.LG)).toBeInTheDocument();
  });

  it('updates the breakpoint when the viewport is resized', () => {
    // Render with a large desktop width
    render(() => <BreakpointProbe />);
    expect(screen.getByText(Breakpoint.LG)).toBeInTheDocument();

    // Shrink the viewport to a tablet width
    setViewportWidth(800);

    // Check the breakpoint follows the new width
    expect(screen.getByText(Breakpoint.MD)).toBeInTheDocument();
    expect(screen.queryByText(Breakpoint.LG)).not.toBeInTheDocument();
  });

  it('shares one resize listener between several callers', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    render(() => (
      <>
        <BreakpointProbe />
        <BreakpointProbe />
      </>
    ));

    expect(screen.getAllByText(Breakpoint.LG)).toHaveLength(2);
    expect(addEventListenerSpy.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
  });
});
