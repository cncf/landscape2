import { type FullDataset, type Item, joinFullDataset } from 'common';

// Origin of the landscape files in development, served by `landscape2 serve`
const DEV_LANDSCAPE_ORIGIN = 'http://localhost:8000';

/** Loads and caches the items of the datasets used by the embed item details view. */
export class ItemsDataGetter {
  private itemsByName: { [key: string]: Item[] } = {};
  private pendingRequests = new Map<string, Promise<void>>();

  /**
   * Load and cache the item data for a classification.
   *
   * @param classifyBy Classification field used by the dataset.
   * @param key Classification value used by the dataset.
   * @param categories Categories that require the full dataset.
   * @returns A promise that resolves when cached data is ready and rejects on failure.
   */
  public fetchItems(classifyBy: string, key: string, categories?: string[]): Promise<void> {
    const name = getDatasetName(classifyBy, key);
    if (this.isReady(name)) return Promise.resolve();

    const pendingRequest = this.pendingRequests.get(name);
    if (pendingRequest) return pendingRequest;

    const shouldLoadFullDataset = Array.isArray(categories) && categories.length > 0;
    const url = getDatasetUrl(shouldLoadFullDataset ? 'full.json' : `embed_full_${name}.json`);

    const request = this.loadItems(url, name).finally(() => {
      this.pendingRequests.delete(name);
    });
    this.pendingRequests.set(name, request);
    return request;
  }

  /**
   * Returns a loaded item by id.
   *
   * @param classifyBy Classification field used by the dataset.
   * @param key Classification value used by the dataset.
   * @param id Item id.
   * @returns The item, or `undefined` when the dataset is not loaded or has no such item.
   */
  public getItemById(classifyBy: string, key: string, id: string): Item | undefined {
    return this.itemsByName[getDatasetName(classifyBy, key)]?.find((item: Item) => item.id === id);
  }

  /**
   * Returns a loaded item by name (for example the parent project of a subproject).
   *
   * @param classifyBy Classification field used by the dataset.
   * @param key Classification value used by the dataset.
   * @param name Item name.
   * @returns The item, or `undefined` when the dataset is not loaded or has no such item.
   */
  public getItemByName(classifyBy: string, key: string, name: string): Item | undefined {
    return this.itemsByName[getDatasetName(classifyBy, key)]?.find((item: Item) => item.name === name);
  }

  // Check whether the items of a dataset are loaded
  private isReady(name: string): boolean {
    return name in this.itemsByName;
  }

  // Fetch a dataset and cache its items
  private async loadItems(url: string, name: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to load item data: ${response.status}`);
    }

    const data = (await response.json()) as FullDataset;
    this.itemsByName[name] = rewriteItemUrls(joinFullDataset(data));
  }
}

// Name of the cached dataset of a classification
const getDatasetName = (classifyBy: string, key: string): string => `${classifyBy}_${key}`;

/**
 * Returns the url of a generated dataset file. The embed-item page lives in
 * the landscape `embed` directory, so the data is resolved against the
 * document (never against a url received in a message). In development the
 * data is served by `landscape2 serve`.
 *
 * @param file Dataset file name (for example `full.json`).
 * @returns Absolute url of the dataset file.
 */
const getDatasetUrl = (file: string): string =>
  import.meta.env.MODE === 'development'
    ? `${DEV_LANDSCAPE_ORIGIN}/data/${file}`
    : new URL(`../data/${file}`, document.baseURI).href;

// Url of a landscape file (logo or CLOMonitor report summary) from the embed directory
const getLandscapeFileUrl = (path: string): string =>
  import.meta.env.MODE === 'development' ? `${DEV_LANDSCAPE_ORIGIN}/${path}` : `../${path}`;

// Rewrite the logo and CLOMonitor report summary paths of the items, relative
// to the landscape root, so they resolve from the embed directory
const rewriteItemUrls = (items: Item[]): Item[] =>
  items.map((item: Item) => ({
    ...item,
    clomonitor_report_summary: item.clomonitor_report_summary
      ? getLandscapeFileUrl(item.clomonitor_report_summary)
      : undefined,
    logo: getLandscapeFileUrl(item.logo),
  }));

// Create an instance of the ItemsDataGetter
const itemsDataGetter = new ItemsDataGetter();
export default itemsDataGetter;
