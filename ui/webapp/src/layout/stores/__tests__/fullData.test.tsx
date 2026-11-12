import { render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import itemsDataGetter, { type ItemsDataGetter } from '../../../utils/itemsDataGetter';
import { FullDataProvider, useFullDataStatus } from '../fullData';

vi.mock('../../../utils/itemsDataGetter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/itemsDataGetter')>();
  return { ...actual, default: new actual.ItemsDataGetter() };
});

describe('FullDataProvider', () => {
  let unsubscribes: ReturnType<typeof vi.fn>[];

  beforeEach(() => {
    // Track the unsubscribe function returned to each subscriber
    unsubscribes = [];
    const subscribe = itemsDataGetter.subscribe.bind(itemsDataGetter);
    vi.spyOn(itemsDataGetter, 'subscribe').mockImplementation((subscriber) => {
      const unsubscribe = vi.fn(subscribe(subscriber));
      unsubscribes.push(unsubscribe);
      return unsubscribe;
    });
  });

  it('unsubscribes from the full data status when unmounted', () => {
    // Setup
    const { unmount } = renderProvider('provider');
    expect(unsubscribes).toHaveLength(1);

    // Run
    unmount();

    // Check
    expect(unsubscribes[0]).toHaveBeenCalledTimes(1);
  });

  it('keeps every provider subscribed, and drops only the unmounted one', () => {
    // Setup
    const first = renderProvider('first');
    renderProvider('second');

    // Run
    first.unmount();
    (itemsDataGetter as ItemsDataGetter).init({ items: [] });

    // Check
    expect(unsubscribes[0]).toHaveBeenCalledTimes(1);
    expect(unsubscribes[1]).not.toHaveBeenCalled();
    expect(screen.queryByText('first: ready')).not.toBeInTheDocument();
    expect(screen.getByText('second: ready')).toBeInTheDocument();
  });
});

// Helpers.

/** Displays the full data status read from the provider. */
const StatusProbe = (props: { name: string }) => {
  const status = useFullDataStatus();
  return (
    <div>
      {props.name}: {status()}
    </div>
  );
};

/** Renders a full data provider with a probe of its status. */
const renderProvider = (name: string) =>
  render(() => (
    <FullDataProvider>
      <StatusProbe name={name} />
    </FullDataProvider>
  ));
