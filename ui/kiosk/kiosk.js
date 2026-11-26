/**
 * Kiosk page: shows a single project of the landscape (`kiosk.html?item=<id>`),
 * loaded from the generated API (`api/projects/<id>.json`).
 *
 * The build inlines this module in `kiosk.html` and calls `startKiosk` with
 * the landscape configuration. It has no top-level side effects, so it can be
 * imported by tests. It must not contain the template delimiters of Askama.
 */

/**
 * Landscape configuration provided by the build.
 *
 * @typedef {object} KioskConfig
 * @property {string} foundation Foundation name.
 * @property {string} url Landscape url.
 */

const BROWSE_LANDSCAPE_LABEL = 'Browse the landscape';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const GITHUB_REPOSITORY_URL = /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+)$/i;

const GOOD_FIRST_ISSUES_QUERY = 'issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22';

const NO_DATA_TITLE = 'No data available';

const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Start the kiosk page: load the project requested in the page url into the
 * `#app` element.
 *
 * @param {KioskConfig} config Landscape configuration.
 * @returns {Promise<void>}
 */
export const startKiosk = (config) => {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Kiosk mount node #app not found');
  }

  return loadProject(root, config);
};

/**
 * Build the link groups shown below the hero card. Links with unsafe or
 * missing urls are dropped, and so are the groups left without links.
 *
 * @param {Record<string, any>} item Project returned by the API.
 * @param {Record<string, any> | null} primaryRepository Primary repository of the project.
 * @returns {Array<{ title: string, links: Array<{ icon: string, label: string, url: string }> }>}
 */
export const buildSections = (item, primaryRepository) => {
  const summary = item.summary || {};
  const repositoryUrl = primaryRepository ? primaryRepository.url : '';
  const gitHubRepoPath = getGitHubRepoPath(repositoryUrl);
  const goodFirstIssuesUrl =
    gitHubRepoPath && item.maturity !== 'archived'
      ? `https://github.com/${gitHubRepoPath}/${GOOD_FIRST_ISSUES_QUERY}`
      : '';

  const sections = [
    {
      title: 'Get Started',
      links: [
        { icon: 'world', label: 'Website', url: item.website },
        { icon: 'blog', label: 'Intro', url: summary.intro_url },
      ],
    },
    {
      title: 'Contribute',
      links: [
        { icon: gitHubRepoPath ? 'github' : 'link', label: 'Repository', url: repositoryUrl },
        { icon: 'goodfirstissues', label: 'Good first issues', url: goodFirstIssuesUrl },
      ],
    },
    {
      title: 'Community',
      links: [
        { icon: 'slack', label: 'Slack', url: item.slack_url },
        { icon: 'discord', label: 'Discord', url: item.discord_url },
        { icon: 'mailing', label: 'Mailing List', url: item.mailing_list_url },
        { icon: 'discussions', label: 'GitHub Discussions', url: item.github_discussions_url },
        { icon: 'stackoverflow', label: 'Stack Overflow', url: item.stack_overflow_url },
      ],
    },
    {
      title: 'Social',
      links: [
        { icon: 'blog', label: 'Blog', url: item.blog_url },
        { icon: 'twitter', label: 'X / Twitter', url: item.twitter_url },
        { icon: 'bluesky', label: 'Bluesky', url: item.bluesky_url },
        { icon: 'youtube', label: 'YouTube', url: item.youtube_url },
        { icon: 'linkedin', label: 'LinkedIn', url: item.linkedin_url },
        { icon: 'reddit', label: 'Reddit', url: item.reddit_url },
      ],
    },
  ];

  return sections
    .map((section) => ({
      title: section.title,
      links: section.links.map((link) => ({ ...link, url: sanitizeUrl(link.url) })).filter((link) => link.url),
    }))
    .filter((section) => section.links.length > 0);
};

/**
 * Escape the HTML special characters of a value before injecting it into markup.
 *
 * @param {unknown} value Value to escape (`null` and `undefined` give an empty string).
 * @returns {string}
 */
export const escapeHtml = (value) =>
  (value === null || value === undefined ? '' : String(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Format a project or release date for display. Values that are not dates are
 * returned as they are (escaping happens when they are rendered).
 *
 * @param {string | number | Date | null | undefined} value Date to format.
 * @returns {string}
 */
export const formatDate = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return DATE_FORMATTER.format(date).replace(/\b([a-z])/, (_match, character) => character.toUpperCase());
};

/**
 * Format a repository stat (stars, contributors) with a `k` or `M` suffix.
 *
 * @param {unknown} value Number to format.
 * @returns {string} The formatted number, or an empty string when the value is not a number.
 */
export const formatNumber = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }

  if (value >= 999500) {
    return `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: value >= 10000000 ? 0 : 1,
      minimumFractionDigits: 0,
    }).format(value / 1000000)}M`;
  }

  if (value >= 999.5) {
    return `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: value >= 10000 ? 0 : 1,
      minimumFractionDigits: 0,
    }).format(value / 1000)}k`;
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
};

/**
 * Return the `owner/name` path of a GitHub repository url (a trailing slash is ignored).
 *
 * @param {unknown} url Repository url.
 * @returns {string | null} The repository path, or `null` when the url is not a GitHub repository.
 */
export const getGitHubRepoPath = (url) => {
  if (typeof url !== 'string') {
    return null;
  }

  const match = GITHUB_REPOSITORY_URL.exec(url.trim().replace(/\/+$/, ''));
  return match ? `${match[1]}/${match[2]}` : null;
};

/**
 * Pick the repository used for the project stats and links: the one flagged
 * as `primary`, or else the first one.
 *
 * @param {Record<string, any>} item Project returned by the API.
 * @returns {Record<string, any> | null}
 */
export const getPrimaryRepository = (item) => {
  const repositories = Array.isArray(item && item.repositories) ? item.repositories : [];
  return repositories.find((repository) => repository && repository.primary) || repositories[0] || null;
};

/**
 * Load the project requested in the page url (`?item=<id>`) and render it, or
 * the status explaining why it cannot be shown.
 *
 * @param {HTMLElement} root Element the page is rendered into.
 * @param {KioskConfig} config Landscape configuration.
 * @param {typeof fetch} [fetchFn] Function used to fetch the project.
 * @returns {Promise<void>}
 */
export const loadProject = async (root, config, fetchFn = fetch) => {
  const renderNoData = (message) =>
    renderStatus(root, { actionLabel: BROWSE_LANDSCAPE_LABEL, actionUrl: config.url, message, title: NO_DATA_TITLE });

  // A project must be requested
  const itemId = getQueryItem();
  if (!itemId) {
    renderNoData('Add an item query parameter to load a project from the landscape.');
    return;
  }

  renderStatus(root, {
    loading: true,
    message: 'Fetching the latest project details from the landscape API.',
    title: 'Loading project',
  });

  try {
    // Fetch the project from the API
    const response = await fetchFn(getProjectApiUrl(itemId), { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      renderNoData('We could not find project data for the requested item.');
      return;
    }

    // Render it when the payload is a project
    const project = await response.json();
    if (!project || typeof project !== 'object' || !project.id) {
      renderNoData('The project response did not include usable data.');
      return;
    }

    renderProject(root, project, config);
  } catch {
    renderNoData('Something went wrong while loading project data.');
  }
};

/**
 * Render a project into the kiosk layout, and set the page title.
 *
 * @param {HTMLElement} root Element the page is rendered into.
 * @param {Record<string, any>} item Project returned by the API.
 * @param {KioskConfig} config Landscape configuration.
 * @returns {void}
 */
export const renderProject = (root, item, config) => {
  const { foundation } = config;
  const name = String(item.name || '');
  const landscapeName = foundation ? `${foundation} Landscape` : 'Landscape';
  const primaryRepository = getPrimaryRepository(item);
  const maturity = item.maturity ? String(item.maturity).trim() : '';
  const maturityClass = maturity.toLowerCase() === 'archived' ? ' archived' : '';

  // Description, as resolved by the build
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const descriptionMarkup = description ? `<p class="description">${escapeHtml(description)}</p>` : '';

  // Primary repository stats (values are escaped once, here)
  const stats = getRepositoryStats(primaryRepository);
  const statsMarkup =
    stats.length > 0
      ? `<div class="stat-row">${stats
          .map(
            (stat) => `
              <div class="stat-pill">
                <span class="stat-label">${escapeHtml(stat.label)}</span>
                <span class="stat-value">${escapeHtml(stat.value)}</span>
              </div>
            `
          )
          .join('')}</div>`
      : '';

  // Link sections
  const sections = buildSections(item, primaryRepository);
  const sectionsMarkup =
    sections.length > 0
      ? `
        <section class="sections">
          ${sections
            .map(
              (section) => `
                <article class="section-card">
                  <h2 class="section-title">${escapeHtml(section.title)}</h2>
                  <div class="link-list">
                    ${section.links
                      .map(
                        (link) => `
                          <a class="link-item" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer noopener">
                            ${renderIcon(link.icon)}
                            <span class="link-copy">
                              <span class="link-label">${escapeHtml(link.label)}</span>
                            </span>
                          </a>
                        `
                      )
                      .join('')}
                  </div>
                </article>
              `
            )
            .join('')}
        </section>
      `
      : '';

  // Logo, or the first letter of the name when there is none
  const logoUrl = sanitizeUrl(item.logo_url);
  const logoMarkup = logoUrl
    ? `<img class="project-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name)} logo" loading="eager" />`
    : `<span class="logo-fallback">${escapeHtml(name.charAt(0) || '?')}</span>`;

  document.title = `${normalizeText(name)} | ${normalizeText(landscapeName)}`;
  root.innerHTML = `
    <div class="shell">
      <section class="hero">
        <div class="hero-top">
          <div class="hero-copy">
            <h1 class="title">${escapeHtml(name)}</h1>
            <div class="badge-row">
              ${foundation ? `<span class="badge badge-foundation">${escapeHtml(foundation)}</span>` : ''}
              ${maturity ? `<span class="badge badge-maturity${maturityClass}">${escapeHtml(maturity)}</span>` : ''}
            </div>
          </div>
          <div class="hero-logo">${logoMarkup}</div>
        </div>
        ${descriptionMarkup}
        ${statsMarkup}
      </section>
      ${sectionsMarkup}
      <footer class="footer-card">Powered by <a href="${escapeHtml(sanitizeUrl(config.url))}">${escapeHtml(landscapeName)}</a></footer>
    </div>
  `;
};

/**
 * Render a loading or no data status card. The title and message are in a
 * status region, updated in place while the card is shown, so screen readers
 * announce each new status.
 *
 * @param {HTMLElement} root Element the page is rendered into.
 * @param {object} options
 * @param {string} options.message Status message.
 * @param {string} options.title Status title.
 * @param {string} [options.actionLabel] Label of the action link (not shown while loading).
 * @param {string} [options.actionUrl] Url of the action link.
 * @param {boolean} [options.loading] Whether the status is a loading one.
 * @returns {void}
 */
export const renderStatus = (root, options) => {
  const { actionLabel = '', actionUrl = '', loading = false, message, title } = options;

  // Render the status card unless it is already shown
  if (!root.querySelector('.status-card')) {
    root.innerHTML = `
      <div class="shell">
        <section class="status-card">
          <div class="status-content">
            <div class="spinner" aria-hidden="true"></div>
            <div class="status-message" role="status" aria-live="polite"></div>
            <div class="status-actions"></div>
          </div>
        </section>
      </div>
    `;
  }

  // Update the spinner, the status region and the action link
  const resolvedActionUrl = sanitizeUrl(actionUrl);
  root.querySelector('.spinner').hidden = !loading;
  root.querySelector('.status-message').innerHTML = `
    <h1 class="status-title">${escapeHtml(title)}</h1>
    <p class="status-text">${escapeHtml(message)}</p>
  `;
  const actions = root.querySelector('.status-actions');
  const showAction = !loading && actionLabel && resolvedActionUrl;
  actions.hidden = !showAction;
  actions.innerHTML = showAction
    ? `<a class="button-link" href="${escapeHtml(resolvedActionUrl)}">${escapeHtml(actionLabel)}</a>`
    : '';
};

/**
 * Keep only the urls that are safe in links and images (http, https, mailto
 * and tel), resolved against the page origin.
 *
 * @param {unknown} value Url to check.
 * @returns {string} The absolute url, or an empty string when it is missing or unsafe.
 */
export const sanitizeUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  try {
    const parsedUrl = new URL(value.trim(), window.location.origin);
    return SAFE_URL_PROTOCOLS.includes(parsedUrl.protocol) ? parsedUrl.href : '';
  } catch {
    return '';
  }
};

// Url of the API endpoint of a project, relative to the kiosk page
const getProjectApiUrl = (itemId) =>
  new URL(`api/projects/${encodeURIComponent(itemId)}.json`, window.location.href).href;

// Id of the project requested in the page url
const getQueryItem = () => (new URLSearchParams(window.location.search).get('item') || '').trim();

// Stats of the primary repository that have a value
const getRepositoryStats = (repository) => {
  if (!repository) {
    return [];
  }

  return [
    typeof repository.stars === 'number' ? { label: 'Stars', value: formatNumber(repository.stars) } : null,
    typeof repository.contributors === 'number'
      ? { label: 'Contributors', value: formatNumber(repository.contributors) }
      : null,
    repository.license ? { label: 'License', value: repository.license } : null,
    repository.latest_release ? { label: 'Latest release', value: formatDate(repository.latest_release) } : null,
  ].filter(Boolean);
};

// Collapse the whitespace of a plain text value
const normalizeText = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

// Icon of the inline SVG sprite
const renderIcon = (icon) =>
  `<span class="link-icon" aria-hidden="true"><svg fill="currentColor" xmlns="http://www.w3.org/2000/svg"><use href="#icon-${icon}"></use></svg></span>`;
