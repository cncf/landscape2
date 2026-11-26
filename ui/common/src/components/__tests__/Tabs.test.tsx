import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from '../Tabs';

describe('Tabs', () => {
  it('selects the initially active tab', () => {
    render(() => <Tabs tabs={createTabs()} initialActive="ascii" noDataContent="No data" />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AsciiDoc' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Markdown' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { name: 'AsciiDoc' })).toHaveTextContent('AsciiDoc content');
  });

  it('shows the panel of the clicked tab', async () => {
    // Setup
    const user = userEvent.setup();
    render(() => <Tabs tabs={createTabs()} initialActive="markdown" noDataContent="No data" />);
    const asciiTab = screen.getByRole('tab', { name: 'AsciiDoc' });

    // Run
    await user.click(asciiTab);

    // Check
    expect(asciiTab).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel', { name: 'AsciiDoc' });
    expect(panel).toHaveTextContent('AsciiDoc content');
    expect(panel).not.toHaveTextContent('Markdown content');
    expect(asciiTab).toHaveAttribute('aria-controls', panel.id);
    expect(screen.getByRole('tab', { name: 'Markdown' })).toHaveAttribute('aria-controls', panel.id);
  });

  it('calls each tab content function once per activation', async () => {
    // Setup
    const user = userEvent.setup();
    const markdownContent = vi.fn(() => <p>Markdown content</p>);
    const asciiContent = vi.fn(() => <p>AsciiDoc content</p>);
    render(() => (
      <Tabs
        tabs={[
          { name: 'markdown', title: 'Markdown', content: markdownContent },
          { name: 'ascii', title: 'AsciiDoc', content: asciiContent },
        ]}
        initialActive="markdown"
        noDataContent="No data"
      />
    ));

    // Check
    expect(markdownContent).toHaveBeenCalledOnce();
    expect(asciiContent).not.toHaveBeenCalled();

    // Run
    await user.click(screen.getByRole('tab', { name: 'AsciiDoc' }));
    await user.click(screen.getByRole('tab', { name: 'AsciiDoc' }));

    // Check
    expect(markdownContent).toHaveBeenCalledOnce();
    expect(asciiContent).toHaveBeenCalledOnce();

    // Run
    await user.click(screen.getByRole('tab', { name: 'Markdown' }));

    // Check
    expect(markdownContent).toHaveBeenCalledTimes(2);
    expect(asciiContent).toHaveBeenCalledOnce();
  });

  it('shows the no data message when the active tab does not exist', () => {
    render(() => <Tabs tabs={createTabs()} initialActive="missing" noDataContent="No data available" />);

    expect(screen.getByRole('alert')).toHaveTextContent('No data available');
    expect(screen.getByRole('tab', { name: 'Markdown' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'AsciiDoc' })).toHaveAttribute('aria-selected', 'false');
  });

  it('renders the short title next to the title when given', () => {
    render(() => (
      <Tabs
        tabs={[{ name: 'markdown', title: 'Markdown', shortTitle: 'MD', content: () => 'Markdown content' }]}
        initialActive="markdown"
        noDataContent="No data"
      />
    ));

    const tab = screen.getByRole('tab');
    expect(tab).toHaveTextContent('Markdown');
    expect(tab).toHaveTextContent('MD');
  });
});

// Helpers.

/** Creates the Markdown and AsciiDoc tabs used by most tests. */
const createTabs = () => [
  { name: 'markdown', title: 'Markdown', content: () => <p>Markdown content</p> },
  { name: 'ascii', title: 'AsciiDoc', content: () => <p>AsciiDoc content</p> },
];
