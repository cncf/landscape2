import { CategoriesData } from './itemsDataGetter';

const getCategoriesWithItems = (data: CategoriesData): string[] => {
  const categories: string[] = [];
  Object.keys(data).forEach((cat: string) => {
    let itemsNumber = 0;
    Object.keys(data[cat]).forEach((subcat: string) => {
      itemsNumber += data[cat][subcat].items.length;
    });
    if (itemsNumber > 0) {
      categories.push(cat);
    }
  });
  return categories;
};

export default getCategoriesWithItems;
