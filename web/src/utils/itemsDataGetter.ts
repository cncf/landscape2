import { Item, LandscapeData } from "../types";

export interface ItemsDataHandler {
  updateLandscapeData(items: Item[]): void;
}

export interface ItemsDataStatus {
  updateStatus(status: boolean): void;
}

export class ItemsDataGetter {
  private updateData?: ItemsDataHandler;
  private updateStatus?: ItemsDataStatus;
  public ready = false;
  public landscapeData?: LandscapeData;

  public subscribe(updateData: ItemsDataHandler) {
    this.updateData = updateData;
  }

  public isReady(updateStatus: ItemsDataStatus) {
    this.updateStatus = updateStatus;
  }

  public init() {
    if (!this.ready) {
      fetch(import.meta.env.MODE === 'development' ? "../../static/full.json" : "./data/full.json")
      .then(res => res.json())
      .then(data => {
        this.landscapeData = data;
        this.ready = true;
        if (this.updateData) {
          this.updateData.updateLandscapeData(data.items);
        }
        if (this.updateStatus) {
          this.updateStatus.updateStatus(true);
        }
      });
    }
  }

  public async get(id: string): Promise<Item | undefined> {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.find((i: Item) => id === i.id);
    }
  }
}

const itemsDataGetter = new ItemsDataGetter();
export default itemsDataGetter;
