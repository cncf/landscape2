import { Item, LandscapeData } from "../types";

export class ItemsDataGetter {
  public isReady = false;
  public landscapeData?: LandscapeData;

  public init() {
    if (!this.isReady) {
      fetch(import.meta.env.MODE === 'development' ? "../../static/landscape.json" : "./data/landscape.json")
      .then(res => res.json())
      .then(data => {
        this.landscapeData = data;
          this.isReady = true;
      });
    }
  }

  private async getItemFromJson(id: string): Promise<Item | undefined> {
    return fetch(import.meta.env.MODE === 'development' ? `../../static/landscape-item-${id}.json` : `./data/landscape-item-${id}.json`)
      .then(res => res.json())
      .then(data => {
        return data;
      });
  }

  public async get(id: string): Promise<Item | undefined> {
    if (this.isReady && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.find((i: Item) => id === i.id);
    } else {
      return await this.getItemFromJson(id);
    }
  }
}

const itemsDataGetter = new ItemsDataGetter();
export default itemsDataGetter;
