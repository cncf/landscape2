import { screen, waitFor } from '@solidjs/testing-library';
import { flushPromises } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ALL_OPTION } from '../../../data';
import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithRouter } from '../../../test-utils/render';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { GroupActiveProvider, useGroupActive } from '../groupActive';

const GROUPS = ['g1', 'g2', 'projects-group'];

describe('useGroupActive', () => {
  beforeEach(() => {
    window.baseDS = createBaseData({
      groups: [
        { categories: ['Category 1'], name: 'G1', normalized_name: 'g1' },
        { categories: ['Category 2'], name: 'G2', normalized_name: 'g2' },
        { alias: 'projects', categories: ['Category 3'], name: 'Projects', normalized_name: 'projects-group' },
      ],
    });
    vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(GROUPS);
  });

  it('resolves the group of an alias path', () => {
    renderGroupActive('/projects');
    expect(screen.getByText('group: projects-group')).toBeInTheDocument();
  });

  it('prefers the alias over the group param', () => {
    renderGroupActive('/projects?group=g2');
    expect(screen.getByText('group: projects-group')).toBeInTheDocument();
  });

  it('uses a valid group param', () => {
    renderGroupActive('/?group=g2');
    expect(screen.getByText('group: g2')).toBeInTheDocument();
  });

  it('uses the all option param', () => {
    renderGroupActive('/?group=all');
    expect(screen.getByText(`group: ${ALL_OPTION}`)).toBeInTheDocument();
  });

  it.each([
    ['a repeated group param', '/?group=g1&group=g2'],
    ['a missing group param', '/?view-mode=grid'],
    ['an unknown group param', '/?group=bogus'],
  ])('uses the first group for %s', (_, url) => {
    renderGroupActive(url);
    expect(screen.getByText('group: g1')).toBeInTheDocument();
  });

  it('gives the all option when the landscape has no groups', () => {
    vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(undefined);

    renderGroupActive('/?group=g1');
    expect(screen.getByText(`group: ${ALL_OPTION}`)).toBeInTheDocument();
  });

  it('follows a navigation to another group', async () => {
    // Render the store on the first group
    const { history } = renderGroupActive('/?group=g1');
    expect(screen.getByText('group: g1')).toBeInTheDocument();

    // Navigate to another group and verify the store follows it
    history.set({ value: '/?group=g2' });
    await waitFor(() => expect(screen.getByText('group: g2')).toBeInTheDocument());
  });

  it('replaces an unknown group param on Explore, keeping the other params and the hash', async () => {
    // Render the store on another page and navigate to Explore with an unknown group
    const { history } = renderGroupActive('/stats');
    history.set({ value: '/?group=bogus&project=a&item=x#h' });

    // Verify only the group param is corrected
    await waitFor(() => expect(history.get()).toBe('/?group=g1&project=a&item=x#h'));
    expect(screen.getByText('group: g1')).toBeInTheDocument();

    // Verify the entry was replaced, so the previous one is the page the user came from
    history.back();
    await waitFor(() => expect(history.get()).toBe('/stats'));
  });

  it('leaves an unknown group param untouched outside Explore', async () => {
    // Render the store on the guide with an unknown group
    const { history } = renderGroupActive('/guide?group=bogus');

    // Verify the URL is not corrected
    await flushPromises();
    expect(history.get()).toBe('/guide?group=bogus');
  });
});

// Helpers.

/** Displays the active group store value. */
const GroupProbe = () => {
  const group = useGroupActive();
  return <span>group: {group()}</span>;
};

/** Renders the active group store at the URL provided. */
const renderGroupActive = (url: string) =>
  renderWithRouter(
    () => (
      <GroupActiveProvider>
        <GroupProbe />
      </GroupActiveProvider>
    ),
    { url }
  );
