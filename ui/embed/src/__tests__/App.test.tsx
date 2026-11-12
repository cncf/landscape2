import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createDeferred, embedFixtures } from 'common/test-utils';
import type { EmbedView } from 'common/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

const CATEGORY_VIEW = embedFixtures['category_category-1'];
const ITEM_1_ID = 'category-1--subcategory-1-1--item-1';

// Attributes the styled-only props would leave on the DOM if they were forwarded
// (listed here, not taken from `EMBED_STYLE_PROPS`, so a prop missing there fails)
const STYLE_PROP_ATTRIBUTES = [
  'alignment',
  'borderless',
  'firsttitle',
  'fontfamily',
  'isbgtransparent',
  'itemnamesize',
  'multicategory',
  'paddingbottom',
  'size',
  'spacing',
  'uppercase',
  'withshadow',
];

// Second category of the multi-category views
const CATEGORY_2_VIEW: EmbedView = {
  classification: {
    category: {
      name: 'Category 2',
      normalized_name: 'category-2',
      subcategories: [{ name: 'Subcategory 2-1', normalized_name: 'subcategory-2-1' }],
    },
  },
  foundation: 'Foundation',
  items: [CATEGORY_VIEW.items[2]],
};

describe('App', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('shows the loading status while the view loads', () => {
    // Setup
    setEmbedUrl('?key=category-1&headers=true');
    fetchMock.mockReturnValue(createDeferred<Response>().promise);

    // Run
    render(() => <App />);

    // Check
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('renders the category and subcategory titles with their item counts', async () => {
    // Setup
    setEmbedUrl('?key=category-1&headers=true');
    fetchMock.mockResolvedValue(jsonResponse(CATEGORY_VIEW));

    // Run
    render(() => <App />);

    // Check
    expect(await screen.findByText('Subcategory 1-1 (3)')).toBeInTheDocument();
    expect(screen.getByText('Category 1')).toBeInTheDocument();
    expect(screen.queryByText(/Subcategory 1-2/)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/data/embed_category_category-1.json');
  });

  it('loads the data from the base path', async () => {
    // Setup
    setEmbedUrl('?key=category-1&base-path=/landscape');
    fetchMock.mockResolvedValue(jsonResponse(CATEGORY_VIEW));

    // Run
    render(() => <App />);

    // Check
    expect(await screen.findByRole('link', { name: 'Item 1 details' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/landscape/data/embed_category_category-1.json');
  });

  it('loads the data from the landscape root for base-path=/', async () => {
    // Setup
    setEmbedUrl('?key=category-1&base-path=/');
    fetchMock.mockResolvedValue(jsonResponse(CATEGORY_VIEW));

    // Run
    render(() => <App />);

    // Check
    expect(await screen.findByRole('link', { name: 'Item 1 details' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/data/embed_category_category-1.json');
  });

  it('shows invalid embed url for a base path on another origin, without fetching', () => {
    // Setup
    setEmbedUrl('?key=category-1&base-path=//evil.example');

    // Run
    render(() => <App />);

    // Check
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid embed url');
    expect(screen.getByRole('link', { name: `${location.origin}/embed-setup` })).toHaveAttribute(
      'href',
      `${location.origin}/embed-setup`
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows invalid embed url for an invalid style, without fetching', () => {
    // Setup
    setEmbedUrl('?key=category-1&style=fancy');

    // Run
    render(() => <App />);

    // Check
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid embed url');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a retryable error when the fetch fails, and refetches on try again', async () => {
    // Setup
    const user = userEvent.setup();
    setEmbedUrl('?key=category-1&headers=true');
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(CATEGORY_VIEW));
    render(() => <App />);

    // Run
    expect(await screen.findByRole('alert')).toHaveTextContent('This view could not be loaded.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // Check
    expect(await screen.findByText('Subcategory 1-1 (3)')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      'an error response',
      () => Promise.resolve({ json: () => Promise.resolve({}), ok: false, status: 404 } as Response),
    ],
    ['invalid JSON', () => Promise.resolve({ json: () => Promise.reject(new SyntaxError('x')), ok: true } as Response)],
  ])('shows the retryable error for %s', async (_, response) => {
    // Setup
    setEmbedUrl('?key=category-1');
    fetchMock.mockImplementation(response);

    // Run
    render(() => <App />);

    // Check
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('posts the item details message to the parent window when the item modal is enabled', async () => {
    // Setup
    const user = userEvent.setup();
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    setEmbedUrl('?key=category-1&item-modal=true&hide-organization-section=true&base-path=/landscape');
    fetchMock.mockResolvedValue(jsonResponse(CATEGORY_VIEW));
    render(() => <App />);

    // Run
    await user.click(await screen.findByRole('button', { name: 'Item 1 info' }));

    // Check
    expect(postMessage).toHaveBeenCalledExactlyOnceWith(
      {
        classifyBy: 'category',
        foundation: 'Foundation',
        hideOrganizationSection: true,
        itemId: ITEM_1_ID,
        key: 'category-1',
        type: 'showItemDetails',
      },
      '*'
    );
    expect(postMessage.mock.calls[0][0]).not.toHaveProperty('basePath');
    expect(screen.queryByRole('link', { name: 'Item 1 details' })).not.toBeInTheDocument();
  });

  it('renders items as links to the item details without the item modal', async () => {
    // Setup
    setEmbedUrl('?key=category-1');
    fetchMock.mockResolvedValue(jsonResponse(CATEGORY_VIEW));

    // Run
    render(() => <App />);

    // Check
    const link = await screen.findByRole('link', { name: 'Item 1 details' });
    expect(link.getAttribute('href')).toMatch(new RegExp(`\\?item=${ITEM_1_ID}$`));
    expect(screen.getAllByRole('link', { name: /details$/ })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Item 1 info' })).not.toBeInTheDocument();
  });

  it('renders only the items of the selected subcategories', async () => {
    // Setup
    setEmbedUrl('?key=category-1&headers=true&subcategories=subcategory-1-2');
    fetchMock.mockResolvedValue(jsonResponse(CATEGORY_VIEW));

    // Run
    render(() => <App />);

    // Check
    expect(await screen.findByText('Category 1')).toBeInTheDocument();
    expect(screen.queryByText(/Subcategory 1-1/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /details$/ })).not.toBeInTheDocument();
  });

  it('renders the maturity sections of a maturity view', async () => {
    // Setup
    setEmbedUrl('?classify=maturity&key=all&headers=true');
    fetchMock.mockResolvedValue(jsonResponse(embedFixtures.maturity_all));

    // Run
    render(() => <App />);

    // Check
    expect(await screen.findByText('Early Stage (1)')).toBeInTheDocument();
    expect(screen.getByText('Graduated (1)')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/data/embed_maturity_all.json');
  });

  it('renders the categories of a multi-category view, leaving out the ones that fail to load', async () => {
    // Setup
    const user = userEvent.setup();
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    setEmbedUrl('?categories=category-1,missing,category-2&headers=true&item-modal=true');
    fetchMock.mockImplementation((url) => {
      if (url === '/data/embed_category_category-1.json') return Promise.resolve(jsonResponse(CATEGORY_VIEW));
      if (url === '/data/embed_category_category-2.json') return Promise.resolve(jsonResponse(CATEGORY_2_VIEW));
      return Promise.resolve({ ok: false, status: 404 } as Response);
    });
    render(() => <App />);

    // Run
    expect(await screen.findByText('Category 2')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Item 3 info' })[1]);

    // Check
    expect(screen.getByText('Category 1')).toBeInTheDocument();
    expect(screen.getByText('Subcategory 2-1 (1)')).toBeInTheDocument();
    expect(postMessage).toHaveBeenCalledExactlyOnceWith(
      {
        categories: ['category-1', 'category-2'],
        classifyBy: 'category',
        foundation: 'Foundation',
        hideOrganizationSection: false,
        itemId: 'category-2--subcategory-2-1--item-3',
        key: 'category-1__category-2',
        type: 'showItemDetails',
      },
      '*'
    );
  });

  it('renders the items once, sorted by name, when the headers are hidden', async () => {
    // Setup
    setEmbedUrl('?categories=category-1,category-2');
    fetchMock.mockImplementation((url) =>
      Promise.resolve(jsonResponse(url === '/data/embed_category_category-1.json' ? CATEGORY_VIEW : CATEGORY_2_VIEW))
    );

    // Run
    render(() => <App />);

    // Check
    expect(await screen.findByRole('link', { name: 'Item 1 details' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /details$/ }).map((link) => link.getAttribute('aria-label'))).toEqual([
      'Item 1 details',
      'Item 2 details',
      'Item 3 details',
    ]);
    expect(screen.queryByText('Category 1')).not.toBeInTheDocument();
  });

  it('keeps the styled components props off the DOM when started from the entry point', async () => {
    // Setup
    const root = document.createElement('div');
    root.id = 'landscape-embeddable-view';
    document.body.append(root);
    setEmbedUrl('?key=category-1&headers=true&bg-color=transparent&item-name=true&items-spacing=8');
    fetchMock.mockResolvedValue(jsonResponse(CATEGORY_VIEW));

    // Run
    await import('../index');

    // Check
    expect(await screen.findByText('Subcategory 1-1 (3)')).toBeInTheDocument();
    expect(root.querySelectorAll(STYLE_PROP_ATTRIBUTES.map((attribute) => `[${attribute}]`).join(','))).toHaveLength(0);
    root.remove();
  });
});

// Helpers.

/** Builds a successful fetch response with the JSON data given. */
const jsonResponse = (data: unknown): Response => ({ json: () => Promise.resolve(data), ok: true }) as Response;

/** Sets the query string of the embed url. */
const setEmbedUrl = (search: string): void => {
  window.history.replaceState(null, '', `/embed/embed.html${search}`);
};
