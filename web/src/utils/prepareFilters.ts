import { FilterCategory, FilterSection, Item, Repository } from "../types";

const cleanValue = (t: string): string => {
  // return encodeURIComponent(t);
  return t;
};

const prepareFilters = (items: Item[]): FilterSection[] => {
  const filters: FilterSection[] = [];

  const organizations: string[] = [];
  const licenses: string[] = [];
  const countries: string[] = [];
  let categories: string[] = [];

  items.forEach((i: Item) => {
    if (i.crunchbase_data) {
      if (i.crunchbase_data.name) {
        organizations.push(i.crunchbase_data.name);
      }

      if (i.crunchbase_data.country) {
        countries.push(i.crunchbase_data.country);
      }

      if (i.crunchbase_data.categories) {
        categories = [...categories, ...i.crunchbase_data.categories];
      }
    }

    if (i.repositories) {
      i.repositories.forEach((r: Repository) => {
        if (r.github_data && r.github_data.license) {
          licenses.push(r.github_data.license);
        }
      });
    }
  });

  filters.push({
    value: FilterCategory.Organization,
    title: 'Organization',
    options: [...new Set(organizations)].sort().map((org: string) => ({
      value: cleanValue(org),
      name: org
    })),
  });

  filters.push({
    value: FilterCategory.License,
    title: 'License',
    options: [...new Set(licenses)].sort().map((license: string) => ({
      value: cleanValue(license),
      name: license
    })),
  });

  filters.push({
    value: FilterCategory.Country,
    title: 'Country',
    options: [...new Set(countries)].sort().map((country: string) => ({
      value: cleanValue(country),
      name: country
    })),
  });

  filters.push({
    value: FilterCategory.Industry,
    title: 'Industry',
    options: [...new Set(categories)].sort().map((category: string) => ({
      value: cleanValue(category),
      name: category
    })),
  });

  return filters;
};

export default prepareFilters;
