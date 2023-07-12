import { ActiveFilters, BaseItem, FilterCategory, Item } from "../types";

const filterData = (items: (BaseItem | Item)[], activeFilters: ActiveFilters): (BaseItem | Item)[] => {
  if (Object.keys(activeFilters).length > 0) {
    let filteredItems: BaseItem[] = [];
    Object.keys(activeFilters).forEach((f: string) => {
      if (f === FilterCategory.Project) {
        const includedUndefined = activeFilters[FilterCategory.Project]?.includes('non-cncf');
        filteredItems = items.filter((item: BaseItem) => {
          if (includedUndefined && item.project === undefined) {
            return item;
          } else if (item.project !== undefined && activeFilters[FilterCategory.Project]?.includes(item.project)) {
            return item;
          }
        });
      }
    });
    return filteredItems;
  } else {
    return items;
  }
};

export default filterData;
