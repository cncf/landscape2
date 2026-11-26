import { createGithubRepository, createRepository } from 'common/test-utils';
import { describe, expect, it } from 'vitest';

import getRepositoryLicenses from '../getRepositoryLicenses';

describe('getRepositoryLicenses', () => {
  it('takes the repository license over the GitHub license', () => {
    const repositories = [
      createRepository({ github_data: createGithubRepository({ license: 'MIT' }), license: 'Apache-2.0' }),
    ];

    expect(getRepositoryLicenses(repositories)).toEqual(['Apache-2.0']);
  });

  it('falls back to the GitHub license when the repository has none', () => {
    const repositories = [createRepository({ github_data: createGithubRepository({ license: 'MIT' }) })];

    expect(getRepositoryLicenses(repositories)).toEqual(['MIT']);
  });

  it('returns one license per repository that has one, in order', () => {
    const repositories = [
      createRepository({ license: 'Apache-2.0' }),
      createRepository({ github_data: createGithubRepository() }),
      createRepository({ github_data: createGithubRepository({ license: 'MIT' }) }),
    ];

    expect(getRepositoryLicenses(repositories)).toEqual(['Apache-2.0', 'MIT']);
  });

  it('returns no licenses when there are no repositories', () => {
    expect(getRepositoryLicenses()).toEqual([]);
    expect(getRepositoryLicenses([])).toEqual([]);
  });
});
