import { CategoriesData } from './itemsDataGetter';

const countVisibleItems = (data: CategoriesData): number => {
  let num = 0;

  Object.keys(data).forEach((cat: string) => {
    Object.keys(data[cat]).forEach((subcat: string) => {
      num = num + data[cat][subcat].items.length;
    });
  });

  return num;
};

export default countVisibleItems;
