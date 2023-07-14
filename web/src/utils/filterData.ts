import { ActiveFilters, FilterCategory, Item, Repository } from '../types';

const filterData = (items: Item[], activeFilters: ActiveFilters): Item[] => {
  if (Object.keys(activeFilters).length > 0) {
    const filteredItems: Item[] = items.filter((item: Item) => {
      // Filter Organization
      if (activeFilters[FilterCategory.Organization]) {
        if (item.crunchbase_data === undefined || item.crunchbase_data.name === undefined) {
          return false;
        } else if (!activeFilters[FilterCategory.Organization].includes(item.crunchbase_data.name)) {
          return false;
        }
      }

      // Filter Country
      if (activeFilters[FilterCategory.Country]) {
        if (item.crunchbase_data === undefined || item.crunchbase_data.country === undefined) {
          return false;
        } else if (!activeFilters[FilterCategory.Country].includes(item.crunchbase_data.country)) {
          return false;
        }
      }

      // Filter Industry
      if (activeFilters[FilterCategory.Industry]) {
        if (item.crunchbase_data === undefined || item.crunchbase_data.categories === undefined) {
          return false;
        } else if (
          !item.crunchbase_data.categories.some((c: string) => activeFilters[FilterCategory.Industry]?.includes(c))
        ) {
          return false;
        }
      }

      // License License
      if (activeFilters[FilterCategory.License]) {
        if (item.repositories === undefined) {
          return false;
        } else {
          const licenses: string[] = [];
          item.repositories.forEach((repo: Repository) => {
            if (repo.github_data && repo.github_data.license) {
              licenses.push(repo.github_data.license);
            }
          });
          if (!licenses.some((l: string) => activeFilters[FilterCategory.License]?.includes(l))) {
            return false;
          }
        }
      }

      // Filter CompanyType
      if (activeFilters[FilterCategory.CompanyType]) {
        if (item.crunchbase_data === undefined || item.crunchbase_data.company_type === undefined) {
          return false;
        } else if (!activeFilters[FilterCategory.CompanyType].includes(item.crunchbase_data.company_type)) {
          return false;
        }
      }

      //  Project filter
      if (activeFilters[FilterCategory.Project]) {
        if (item.project === undefined && !activeFilters[FilterCategory.Project].includes('non-cncf')) {
          return false;
        } else {
          if (item.project !== undefined && !activeFilters[FilterCategory.Project].includes(item.project)) {
            return false;
          }
        }
      }

      return true;
    });

    return filteredItems;
  } else {
    return items;
  }
};

export default filterData;
