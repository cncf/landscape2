import { ActiveSection } from '../layout/context/AppContext';
import { Item, LandscapeData } from '../types';

export interface ItemsDataStatus {
  updateStatus(status: boolean): void;
}

export class ItemsDataGetter {
  private updateStatus?: ItemsDataStatus;
  public ready = false;
  public landscapeData?: LandscapeData;

  public subscribe(updateStatus: ItemsDataStatus) {
    this.updateStatus = updateStatus;
  }

  public init() {
    if (!this.ready) {
      fetch(import.meta.env.MODE === 'development' ? '../../static/full.json' : './data/full.json')
        .then((res) => res.json())
        .then((data: LandscapeData) => {
          this.landscapeData = { ...data };
          this.ready = true;
          if (this.updateStatus) {
            this.updateStatus.updateStatus(true);
          }
        });
    }
  }

  public getAll(): Item[] {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items;
    }
    return [];
  }

  public findById(id: string): Item | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.find((i: Item) => id === i.id);
    }
  }

  public filterItemsBySection(activeSection: ActiveSection): Item[] | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter(
        (i: Item) => activeSection.subcategory === i.subcategory && activeSection.category === i.category
      );
    }
  }
}

const itemsDataGetter = new ItemsDataGetter();
export default itemsDataGetter;
