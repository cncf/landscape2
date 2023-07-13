import { BaseData, BaseItem, Category, Group, Item } from "../types";

export interface CategoriesData {
  [key: string]: {
    [key: string]: SubcategoryData;
  }
}

export interface SubcategoryData {
  items: (BaseItem | Item)[];
  itemsCount: number;
  itemsFeaturedCount: number;
}

const prepareData = (data: BaseData, items: (BaseItem | Item)[], group?: string): CategoriesData => {
  const categories: CategoriesData = {};
  let categoriesList: Category[] = [];

  if (group && data.groups) {
    const activeGroupData = data.groups.find((g: Group) => g.name === group);
    if (activeGroupData) {
      activeGroupData.categories.forEach((cat: string) => {
        const category = data.categories.find((c: Category) => c.name === cat);
        if (category) {
          categoriesList.push(category);
        }
      });
    } else {
      categoriesList = data.categories;
    }
  } else {
    categoriesList = data.categories;
  }

  categoriesList.forEach((cat: Category) => {
    categories[cat.name] = {};
    cat.subcategories.forEach((subcat: string) => {
      categories[cat.name][subcat] = {
        items: [],
        itemsCount: 0,
        itemsFeaturedCount: 0
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

export default prepareData;
