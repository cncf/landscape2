import { GithubRepository, Item, Organization, Repository } from 'common';

export interface ItemsDataStatus {
  updateStatus(status: boolean): void;
}

export interface EmbedData {
  items?: Item[];
  crunchbase_data?: CrunchbaseData;
  github_data?: GithubData;
}

export interface CrunchbaseData {
  [key: string]: Organization;
}

export interface GithubData {
  [key: string]: GithubRepository;
}

export class ItemsDataGetter {
  private updateStatus?: ItemsDataStatus;
  private landscapeData: { [key: string]: EmbedData } = {};
  private pendingRequests = new Map<string, Promise<void>>();

  // Subscribe to the updateStatus
  public subscribe(updateStatus: ItemsDataStatus) {
    this.updateStatus = updateStatus;
  }

  /**
   * Load and cache the item data for a classification.
   *
   * @param classifyBy Classification field used by the dataset.
   * @param key Classification value used by the dataset.
   * @param basePath Base URL for generated landscape data.
   * @param categories Categories that require the full dataset.
   * @returns A promise that resolves when cached data is ready and rejects on failure.
   */
  public fetchItems(classifyBy: string, key: string, basePath: string, categories?: string[]): Promise<void> {
    const name = `${classifyBy}_${key}`;
    if (this.isReady(name)) return Promise.resolve();

    const pendingRequest = this.pendingRequests.get(name);
    if (pendingRequest) return pendingRequest;

    const shouldLoadFullDataset = Array.isArray(categories) && categories.length > 0;
    const url = shouldLoadFullDataset
      ? import.meta.env.MODE === 'development'
        ? `http://localhost:8000/data/full.json`
        : `${basePath}/data/full.json`
      : import.meta.env.MODE === 'development'
        ? `http://localhost:8000/data/embed_full_${name}.json`
        : `${basePath}/data/embed_full_${name}.json`;

    const request = this.loadItems(url, name).finally(() => {
      this.pendingRequests.delete(name);
    });
    this.pendingRequests.set(name, request);
    return request;
  }

  private async loadItems(url: string, name: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to load item data: ${response.status}`);
    }

    const data = (await response.json()) as EmbedData;
    await this.initialDataPreparation(data, name);
    this.updateStatus?.updateStatus(true);
  }

  private async initialDataPreparation(data: EmbedData, name: string) {
    await this.extendItemsData(data.items, data.crunchbase_data, data.github_data).then(
      (items) =>
        (this.landscapeData[name] = {
          ...data,
          items: items,
        })
    );
  }

  public getAvailableKeys(): string[] {
    return Object.keys(this.landscapeData);
  }

  public isReady(name: string): boolean {
    return !!this.landscapeData[name];
  }

  private getUrlLogo(logo: string): string {
    return import.meta.env.MODE === 'development' ? `http://localhost:8000/${logo}` : `../${logo}`;
  }

  private getUrlClomonitorImage(reportSummary?: string): string | undefined {
    if (reportSummary) {
      return import.meta.env.MODE === 'development' ? `http://localhost:8000/${reportSummary}` : `../${reportSummary}`;
    }
    return;
  }

  // Extend items with crunchbase and github data
  private async extendItemsData(
    items?: Item[],
    crunchbaseData?: CrunchbaseData,
    githubData?: GithubData
  ): Promise<Item[]> {
    const itemsList: Item[] = [];

    if (items) {
      items.forEach((item: Item) => {
        const extendedItem = { ...item };
        // Extend Item with crunchbase_data
        if (item.crunchbase_url && crunchbaseData && crunchbaseData[item.crunchbase_url!]) {
          extendedItem.crunchbase_data = crunchbaseData[item.crunchbase_url!];
        }

        // Extend repositories Item with github_data
        if (item.repositories && githubData) {
          const tmpRepositories: Repository[] = [];
          item.repositories.forEach((repo: Repository) => {
            const tmpRepo = { ...repo };
            if (githubData[repo.url]) {
              tmpRepo.github_data = githubData[repo.url];
            }
            tmpRepositories.push(tmpRepo);
          });
          extendedItem.repositories = tmpRepositories;
        }
        itemsList.push({
          ...extendedItem,
          logo: this.getUrlLogo(extendedItem.logo),
          clomonitor_report_summary: this.getUrlClomonitorImage(extendedItem.clomonitor_report_summary),
        });
      });
    }
    return itemsList;
  }

  // Get item by id
  public getItemById(classifyBy: string, key: string, id: string): Item | undefined {
    const name = `${classifyBy}_${key}`;
    if (this.isReady(name) && this.landscapeData[name].items) {
      return this.landscapeData[name]!.items!.find((i: Item) => id === i.id);
    }
  }
}

// Create an instance of the ItemsDataGetter
const itemsDataGetter = new ItemsDataGetter();
export default itemsDataGetter;
