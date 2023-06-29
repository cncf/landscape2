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

  public async get(id: string): Promise<Item | undefined> {
    if (this.isReady && this.landscapeData) {
      return  this.landscapeData.items?.find((i: Item) => id === i.id);
    } else {
      fetch(import.meta.env.MODE === 'development' ? `../../static/landscape-item-${id}.json` : `./data/landscape-item-${id}.json`)
      .then(res => res.json())
      .then(data => {
        return data;
      });
    }
    return;
  }
}

const itemsDataGetter = new ItemsDataGetter();
export default itemsDataGetter;
