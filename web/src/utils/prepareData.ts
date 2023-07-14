import { BaseData, BaseItem, Category, Group, Item } from '../types';

export interface GroupData {
  [key: string]: CategoriesData;
}

export interface CategoriesData {
  [key: string]: {
    [key: string]: SubcategoryData;
  };
}

export interface SubcategoryData {
  items: (BaseItem | Item)[];
  itemsCount: number;
  itemsFeaturedCount: number;
}

const getCategoriesData = (categoriesList: Category[], items: (BaseItem | Item)[]): CategoriesData => {
  const categories: CategoriesData = {};

  categoriesList.forEach((cat: Category) => {
    categories[cat.name] = {};
    cat.subcategories.forEach((subcat: string) => {
      categories[cat.name][subcat] = {
        items: [],
        itemsCount: 0,
        itemsFeaturedCount: 0,
      };
    });
  });

  items.forEach((item: BaseItem) => {
    if (categories[item.category] && categories[item.category][item.subcategory]) {
      categories[item.category][item.subcategory].items.push(item);
      categories[item.category][item.subcategory].itemsCount++;
      if (item.featured) {
        categories[item.category][item.subcategory].itemsFeaturedCount++;
      }
    }
  });

  return categories;
};

const prepareData = (data: BaseData, items: (BaseItem | Item)[]): GroupData => {
  const groups: GroupData = {};

  if (data.groups) {
    data.groups.map((g: Group) => {
      const categoriesList: Category[] = [];

      g.categories.forEach((cat: string) => {
        const category = data.categories.find((c: Category) => c.name === cat);
        if (category) {
          categoriesList.push(category);
        }
      });

      groups[g.name] = getCategoriesData(categoriesList, items);
    });
  } else {
    groups.default = getCategoriesData(data.categories, items);
  }

  return groups;
};

export default prepareData;
