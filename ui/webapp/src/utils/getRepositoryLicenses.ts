import compact from 'lodash/compact';

import { Repository } from '../types';

/** Returns the license of each repository: its `license` override, else the license GitHub reports. */
const getRepositoryLicenses = (repositories: Repository[] = []): string[] =>
  compact(repositories.map((repository: Repository) => repository.license || repository.github_data?.license));

export default getRepositoryLicenses;
