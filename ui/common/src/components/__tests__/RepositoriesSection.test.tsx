import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createGithubRepository, createRepository } from '../../test-utils';
import type { Repository } from '../../types/datasets';
import { SVGIconKind } from '../../types/types';
import { RepositoriesSection } from '../RepositoriesSection';
import { SVGIcon } from '../SVGIcon';

describe('RepositoriesSection', () => {
  it('renders a dash when the first commit is missing', () => {
    const repository = createPrimaryRepository({ github_data: createGithubRepository({ first_commit: undefined }) });

    render(() => <RepositoriesSection repositories={[repository]} />);

    expect(getBoxValue('First commit')).toBe('-');
    expect(getBoxValue('Latest commit')).toBe("May '24");
  });

  it('hides the license badge when no license is available', () => {
    const repository = createPrimaryRepository({ github_data: createGithubRepository({ license: undefined }) });

    render(() => <RepositoriesSection repositories={[repository]} />);

    expect(getBadgesTexts()).toEqual(['Primary']);
  });

  it('shows the repository license over the GitHub one', () => {
    const repository = createPrimaryRepository({
      github_data: createGithubRepository({ license: 'Apache-2.0' }),
      license: 'MIT',
    });

    render(() => <RepositoriesSection repositories={[repository]} />);

    expect(getBadgesTexts()).toEqual(['Primary', 'MIT']);
    expect(screen.queryByText('Apache-2.0')).not.toBeInTheDocument();
  });

  it('shows no GitHub badge or link for a primary repository hosted elsewhere', () => {
    const repository = createPrimaryRepository({ url: 'https://gitlab.com/a/b' });

    const { container } = render(() => <RepositoriesSection repositories={[repository]} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="shields.io"]')).toBeNull();
    expect(container.querySelector('a[href*="github.com"]')).toBeNull();
    expect(getRepositoryIconMarkup()).toBe(getIconMarkup(SVGIconKind.Link));
  });

  it('shows the good first issues badge and the GitHub icon for a GitHub repository', () => {
    render(() => <RepositoriesSection repositories={[createPrimaryRepository({ url: 'https://github.com/a/b/' })]} />);

    const badge = screen.getByRole('img', { name: 'Good first issues count' });
    expect(badge.getAttribute('src')).toMatch(
      /^https:\/\/img\.shields\.io\/github\/issues\/a\/b\/good%20first%20issue\.svg/
    );
    expect(badge.closest('a')?.getAttribute('href')).toMatch(/^https:\/\/github\.com\/a\/b\/issues\?/);
    expect(getRepositoryIconMarkup()).toBe(getIconMarkup(SVGIconKind.GitHub));
  });

  it('hides the good first issues badge for archived projects', () => {
    render(() => <RepositoriesSection repositories={[createPrimaryRepository()]} projectMaturity="archived" />);

    expect(screen.queryByRole('img', { name: 'Good first issues count' })).not.toBeInTheDocument();
  });

  it('lists the primary repository first, then the rest alphabetically', () => {
    const repositories = [
      createRepository({ url: 'https://github.com/example/zeta' }),
      createRepository({ url: 'https://github.com/example/alpha' }),
      createPrimaryRepository({ url: 'https://github.com/example/main' }),
    ];

    render(() => <RepositoriesSection repositories={repositories} />);

    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['example/main (primary)', 'example/alpha', 'example/zeta']);
    expect(screen.getByRole('combobox', { name: 'Select repository' })).toHaveValue('https://github.com/example/main');
  });

  it('switches the repository info when another repository is selected', async () => {
    const user = userEvent.setup();
    const repositories = [
      createPrimaryRepository({ github_data: createGithubRepository({ stars: 100 }) }),
      createRepository({
        github_data: createGithubRepository({ stars: 2500 }),
        url: 'https://github.com/example/other',
      }),
    ];

    // Render the primary repository info
    render(() => <RepositoriesSection repositories={repositories} />);
    expect(getBoxValue('Stars')).toBe('100');

    // Select the other repository
    await user.selectOptions(screen.getByRole('combobox', { name: 'Select repository' }), 'example/other');
    expect(screen.getByRole('link', { name: /https:\/\/github\.com\/example\/other/ })).toBeInTheDocument();
    expect(getBoxValue('Stars')).toBe('2.5k');
  });

  it('shows a dash when the latest release is missing', () => {
    const repository = createPrimaryRepository({ github_data: createGithubRepository({ latest_release: undefined }) });

    render(() => <RepositoriesSection repositories={[repository]} />);

    expect(getBoxValue('Latest release')).toBe('-');
  });

  it('shows the latest release month and year', () => {
    const repository = createPrimaryRepository({
      github_data: createGithubRepository({
        latest_release: { ts: '2024-03-10T12:00:00Z', url: 'https://github.com/example/repo/releases/1' },
      }),
    });

    render(() => <RepositoriesSection repositories={[repository]} />);

    expect(getBoxValue('Latest release')).toBe("Mar '24");
  });
});

// Helpers.

/** Creates a primary repository; overrides replace the default fields. */
const createPrimaryRepository = (overrides: Partial<Repository> = {}): Repository =>
  createRepository({ primary: true, ...overrides });

/**
 * Returns the texts of the repository badges. The badges have no accessible role or
 * name, so they are located by their class.
 */
const getBadgesTexts = (): string[] =>
  Array.from(document.querySelectorAll('.badge')).map((badge) => badge.textContent ?? '');

/** Returns the value displayed in the stats box with the given legend. */
const getBoxValue = (legend: string): string | null | undefined =>
  screen.getByText(legend).closest('[aria-description]')?.firstElementChild?.firstElementChild?.textContent;

/** Returns the markup of an icon, to identify the icon a component rendered. */
const getIconMarkup = (kind: SVGIconKind): string => {
  const { container, unmount } = render(() => <SVGIcon kind={kind} />);
  const markup = container.querySelector('svg')!.innerHTML;
  unmount();
  return markup;
};

/** Returns the markup of the icon shown next to the repository path on small screens. */
const getRepositoryIconMarkup = (): string | undefined => document.querySelector('.d-md-none svg')?.innerHTML;
