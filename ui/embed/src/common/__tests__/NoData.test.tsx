import { render, screen } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';

import NoData from '../NoData';

describe('NoData', () => {
  it('renders the message inside an alert', () => {
    render(() => <NoData>No items match the selected filters</NoData>);

    expect(screen.getByRole('alert')).toHaveTextContent('No items match the selected filters');
  });
});
