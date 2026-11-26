import { describe, expect, it } from 'vitest';

import { createItem } from '../../../test-utils';
import type { Item } from '../../../types/datasets';
import { SVGIconKind } from '../../../types/types';
import {
  formatEmployeesRange,
  formatLocation,
  getGitHubRepoPath,
  getItemLinks,
  getLinkedInUrl,
  getPackageManagerIcon,
  hasClomonitorReport,
} from '../helpers';

// Every link field of an item, with a GitHub primary repository and a non-project item
const ALL_LINKS: Partial<Item> = {
  artwork_url: 'https://artwork.example.com',
  blog_url: 'https://blog.example.com',
  bluesky_url: 'https://bsky.app/item',
  crunchbase_url: 'https://crunchbase.com/item',
  devstats_url: 'https://devstats.example.com',
  discord_url: 'https://discord.com/item',
  docker_url: 'https://hub.docker.com/item',
  documentation_url: 'https://docs.example.com',
  facebook_url: 'https://facebook.com/item',
  github_discussions_url: 'https://github.com/owner/repo/discussions',
  gitter_url: 'https://gitter.im/item',
  linkedin_url: 'https://linkedin.com/item',
  mailing_list_url: 'https://lists.example.com',
  openssf_best_practices_url: 'https://bestpractices.dev/item',
  package_manager_url: 'https://pypi.org/project/item',
  pinterest_url: 'https://pinterest.com/item',
  reddit_url: 'https://reddit.com/r/item',
  repositories: [{ primary: true, url: 'https://github.com/owner/repo' }],
  slack_url: 'https://slack.com/item',
  stack_overflow_url: 'https://stackoverflow.com/item',
  twitter_url: 'https://x.com/item',
  youtube_url: 'https://youtube.com/item',
};

describe('formatEmployeesRange', () => {
  it.each([
    [undefined, undefined, '-'],
    [10, 50, '10 - 50'],
    [1000, undefined, '> 1k'],
    [undefined, 5000, '< 5k'],
  ])('formats min %s and max %s as %s', (min, max, expected) => {
    expect(formatEmployeesRange(min, max)).toBe(expected);
  });
});

describe('formatLocation', () => {
  it.each([
    [{}, ''],
    [{ city: 'City' }, 'City'],
    [{ region: 'Region' }, 'Region'],
    [{ country: 'Country' }, 'Country'],
    [{ city: 'City', region: 'Region' }, 'City, Region'],
    [{ city: 'City', country: 'Country' }, 'City, Country'],
    [{ country: 'Country', region: 'Region' }, 'Region, Country'],
    [{ city: 'City', country: 'Country', region: 'Region' }, 'City, Region, Country'],
  ])('formats %o as "%s"', (parts, expected) => {
    expect(formatLocation(parts)).toBe(expected);
  });
});

describe('getGitHubRepoPath', () => {
  it.each([
    ['https://github.com/owner/repo', 'owner/repo'],
    ['https://github.com/owner/repo/', 'owner/repo'],
    ['https://github.com/owner/repo/tree/main', 'owner/repo'],
    ['https://github.com/owner', null],
    ['https://gitlab.com/owner/repo', null],
    ['https://notgithub.com/owner/repo', null],
    ['not a url', null],
  ])('returns the path of %s as %s', (url, expected) => {
    expect(getGitHubRepoPath(url)).toBe(expected);
  });
});

describe('getItemLinks', () => {
  it('returns the present links in display order', () => {
    const item = createItem({
      bluesky_url: 'https://bsky.app/item',
      crunchbase_url: 'https://crunchbase.com/item',
      documentation_url: 'https://docs.example.com',
      facebook_url: 'https://facebook.com/item',
      gitter_url: 'https://gitter.im/item',
      linkedin_url: 'https://linkedin.com/item',
      package_manager_url: 'https://www.npmjs.com/package/item',
      repositories: [{ primary: true, url: 'https://github.com/owner/repo' }],
      slack_url: 'https://slack.com/item',
      twitter_url: 'https://x.com/item',
    });

    expect(getItemLinks(item).map((link) => link.key)).toEqual([
      'website',
      'repository',
      'twitter',
      'linkedin',
      'slack',
      'crunchbase',
      'documentation',
      'package-manager',
      'bluesky',
      'facebook',
      'gitter',
    ]);
  });

  it('returns every link field with its label and icon', () => {
    const links = getItemLinks(createItem(ALL_LINKS));

    expect(links.map(({ key, label, href, icon }) => [key, label, href, icon])).toEqual([
      ['website', 'Website', 'https://example.com', SVGIconKind.World],
      ['repository', 'Repository', 'https://github.com/owner/repo', SVGIconKind.GitHubCircle],
      ['devstats', 'Devstats', 'https://devstats.example.com', SVGIconKind.Stats],
      ['twitter', 'X (Twitter)', 'https://x.com/item', SVGIconKind.Twitter],
      ['youtube', 'Youtube', 'https://youtube.com/item', SVGIconKind.Youtube],
      ['linkedin', 'LinkedIn', 'https://linkedin.com/item', SVGIconKind.LinkedIn],
      ['slack', 'Slack', 'https://slack.com/item', SVGIconKind.Slack],
      ['discord', 'Discord', 'https://discord.com/item', SVGIconKind.Discord],
      ['docker', 'Docker', 'https://hub.docker.com/item', SVGIconKind.Docker],
      ['stack-overflow', 'Stack overflow', 'https://stackoverflow.com/item', SVGIconKind.StackOverflow],
      ['crunchbase', 'Crunchbase', 'https://crunchbase.com/item', SVGIconKind.Crunchbase],
      ['blog', 'Blog', 'https://blog.example.com', SVGIconKind.Blog],
      ['mailing-list', 'Mailing list', 'https://lists.example.com', SVGIconKind.MailingList],
      [
        'openssf-best-practices',
        'OpenSSF best practices',
        'https://bestpractices.dev/item',
        SVGIconKind.OpenssfBestPractices,
      ],
      ['artwork', 'Artwork', 'https://artwork.example.com', SVGIconKind.Artwork],
      [
        'github-discussions',
        'Github discussions',
        'https://github.com/owner/repo/discussions',
        SVGIconKind.Discussions,
      ],
      ['documentation', 'Documentation', 'https://docs.example.com', SVGIconKind.Book],
      ['package-manager', 'Package manager', 'https://pypi.org/project/item', SVGIconKind.PyPi],
      ['pinterest', 'Pinterest', 'https://pinterest.com/item', SVGIconKind.Pinterest],
      ['reddit', 'Reddit', 'https://reddit.com/r/item', SVGIconKind.Reddit],
      ['bluesky', 'Bluesky', 'https://bsky.app/item', SVGIconKind.Bluesky],
      ['facebook', 'Facebook', 'https://facebook.com/item', SVGIconKind.Facebook],
      ['gitter', 'Gitter', 'https://gitter.im/item', SVGIconKind.Discussions],
    ]);
  });

  it('returns only the website for an item without other links', () => {
    expect(getItemLinks(createItem()).map((link) => link.key)).toEqual(['website']);
  });

  it('omits the Crunchbase link for projects', () => {
    const item = createItem({ crunchbase_url: 'https://crunchbase.com/item', maturity: 'sandbox' });

    expect(getItemLinks(item).map((link) => link.key)).not.toContain('crunchbase');
  });

  it.each([
    ['https://github.com/owner/repo', SVGIconKind.GitHubCircle],
    ['https://gitlab.com/owner/repo', SVGIconKind.Link],
    ['https://codeberg.org/owner/repo', SVGIconKind.Link],
  ])('uses the matching icon for the primary repository %s', (url, icon) => {
    const item = createItem({ repositories: [{ url: 'https://github.com/other/repo' }, { primary: true, url }] });

    expect(getItemLinks(item).find((link) => link.key === 'repository')).toEqual({
      href: url,
      icon,
      key: 'repository',
      label: 'Repository',
    });
  });

  it('omits the repository link without a primary repository', () => {
    const item = createItem({ repositories: [{ url: 'https://github.com/owner/repo' }] });

    expect(getItemLinks(item).map((link) => link.key)).not.toContain('repository');
  });

  it('includes the Facebook and Gitter links when present', () => {
    const item = createItem({ facebook_url: 'https://facebook.com/item', gitter_url: 'https://gitter.im/item' });

    expect(getItemLinks(item).filter((link) => ['facebook', 'gitter'].includes(link.key))).toEqual([
      { href: 'https://facebook.com/item', icon: SVGIconKind.Facebook, key: 'facebook', label: 'Facebook' },
      { href: 'https://gitter.im/item', icon: SVGIconKind.Discussions, key: 'gitter', label: 'Gitter' },
    ]);
  });

  it('omits the Facebook and Gitter links when absent', () => {
    const keys = getItemLinks(createItem()).map((link) => link.key);

    expect(keys).not.toContain('facebook');
    expect(keys).not.toContain('gitter');
  });
});

describe('getLinkedInUrl', () => {
  it.each([
    [
      'the item url',
      {
        crunchbase_data: { generated_at: '2024-01-01', linkedin_url: 'https://linkedin.com/org' },
        linkedin_url: 'https://linkedin.com/item',
      },
      'https://linkedin.com/item',
    ],
    [
      'the Crunchbase url as fallback',
      { crunchbase_data: { generated_at: '2024-01-01', linkedin_url: 'https://linkedin.com/org' } },
      'https://linkedin.com/org',
    ],
    ['nothing without urls', { crunchbase_data: { generated_at: '2024-01-01' } }, undefined],
  ])('returns %s', (_, overrides: Partial<Item>, expected) => {
    expect(getLinkedInUrl(createItem(overrides))).toBe(expected);
  });
});

describe('getPackageManagerIcon', () => {
  it.each([
    ['https://cocoapods.org/pods/item', SVGIconKind.Cocoapods],
    ['https://cpan.org/item', SVGIconKind.Perl],
    ['https://metacpan.org/pod/Item', SVGIconKind.Perl],
    ['https://crates.io/crates/item', SVGIconKind.Rust],
    ['https://hex.pm/packages/item', SVGIconKind.Erlang],
    ['https://maven.apache.org/item', SVGIconKind.MavenApache],
    ['https://npmjs.com/package/item', SVGIconKind.NPM],
    ['https://www.npmjs.com/package/item', SVGIconKind.NPM],
    ['https://www.nuget.org/packages/item', SVGIconKind.Nuget],
    ['https://packagist.org/packages/item', SVGIconKind.Packagist],
    ['https://pub.dev/packages/item', SVGIconKind.Flutter],
    ['https://pypi.org/project/item', SVGIconKind.PyPi],
    ['https://rubygems.org/gems/item', SVGIconKind.RubyGems],
    ['https://packages.example.com/item', SVGIconKind.PackageManager],
    ['https://notnpmjs.com/package/item', SVGIconKind.PackageManager],
    ['https://npmjs.com.evil.example/item', SVGIconKind.PackageManager],
    ['not a url', SVGIconKind.PackageManager],
  ])('returns the icon of %s', (url, icon) => {
    expect(getPackageManagerIcon(url)).toBe(icon);
  });
});

describe('hasClomonitorReport', () => {
  it.each([
    ['both fields', { clomonitor_name: 'item', clomonitor_report_summary: 'clomonitor/item.svg' }, true],
    ['the name only', { clomonitor_name: 'item' }, false],
    ['the report summary only', { clomonitor_report_summary: 'clomonitor/item.svg' }, false],
    ['no field', {}, false],
  ])('returns whether an item with %s has a report', (_, overrides: Partial<Item>, expected) => {
    expect(hasClomonitorReport(createItem(overrides))).toBe(expected);
  });
});
