import { CategoriesData } from './itemsDataGetter';

/** Returns the names of the categories that have items in some subcategory, in data order. */
const getCategoriesWithItems = (data: CategoriesData): string[] =>
  Object.keys(data).filter((cat: string) =>
    Object.values(data[cat]).some((subcategoryData) => subcategoryData.items.length > 0)
  );

export default getCategoriesWithItems;
