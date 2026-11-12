import { render, screen } from '@solidjs/testing-library';
import { createGithubRepository, createItem, createRepository } from 'common/test-utils';
import { describe, expect, it } from 'vitest';

import type { Repository } from '../../../../types';
import Card from '../Card';

describe('Card', () => {
  it('renders the stars summed over every repository', () => {
    render(() => <Card item={createItem({ repositories: [repository(0), repository(7), repository(9)] })} />);

    expect(screen.getByText('GitHub stars:').nextElementSibling).toHaveTextContent('16');
  });
});

// Helpers.

/** Creates a repository with GitHub data holding the stars given; its url ends with the stars too. */
const repository = (stars: number): Repository => {
  const url = `https://github.com/example/${stars}`;
  return createRepository({ github_data: createGithubRepository({ stars, url }), url });
};
