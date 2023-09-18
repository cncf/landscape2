import { FilterCategory, FilterSection, Item, Repository } from '../types';
import capitalizeFirstLetter from './capitalizeFirstLetter';
import { GroupData } from './prepareData';

const cleanValue = (t: string): string => {
  // return encodeURIComponent(t);
  return t;
};

export interface FiltersPerGroup {
  [key: string]: FilterSection[];
}

const getFiltersPerGroup = (groupedData: GroupData) => {
  const groups: FiltersPerGroup = {};

  Object.keys(groupedData).forEach((g: string) => {
    const items: Item[] = [];

    Object.keys(groupedData[g]).forEach((cat: string) => {
      Object.keys(groupedData[g][cat]).forEach((subcat: string) => {
        items.push(...groupedData[g][cat][subcat].items);
      });
    });

    groups[g] = prepareFilters(items);
  });

  return groups;
};

const prepareFilters = (items: Item[]): FilterSection[] => {
  const filters: FilterSection[] = [];

  const organizations: string[] = [];
  const licenses: string[] = [];
  const countries: string[] = [];
  const companyTypes: string[] = [];
  const maturityTypes: string[] = [];
  let categories: string[] = [];

  items.forEach((i: Item) => {
    if (i.maturity) {
      maturityTypes.push(i.maturity);
    }

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

      if (i.crunchbase_data.company_type) {
        companyTypes.push(i.crunchbase_data.company_type);
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

  if (organizations.length > 0) {
    filters.push({
      value: FilterCategory.Organization,
      title: 'Organization',
      options: [...new Set(organizations)].sort().map((org: string) => ({
        value: cleanValue(org),
        name: org,
      })),
    });
  }

  if (licenses.length > 0) {
    filters.push({
      value: FilterCategory.License,
      title: 'License',
      options: [...new Set(licenses)].sort().map((license: string) => ({
        value: cleanValue(license),
        name: license,
      })),
    });
  }

  if (countries.length > 0) {
    filters.push({
      value: FilterCategory.Country,
      title: 'Country',
      options: [...new Set(countries)].sort().map((country: string) => ({
        value: cleanValue(country),
        name: country,
      })),
    });
  }

  if (categories.length > 0) {
    filters.push({
      value: FilterCategory.Industry,
      title: 'Industry',
      options: [...new Set(categories)].sort().map((category: string) => ({
        value: cleanValue(category),
        name: category,
      })),
    });

    if (companyTypes.length > 0) {
      filters.push({
        value: FilterCategory.CompanyType,
        title: 'Organization type',
        options: [...new Set(companyTypes)].sort().map((ot: string) => ({
          value: cleanValue(ot),
          name: ot,
        })),
      });
    }

    if (maturityTypes.length > 0) {
      filters.push({
        value: FilterCategory.Maturity,
        title: 'Project',
        options: [...new Set(maturityTypes)].sort().map((pr: string) => ({
          value: cleanValue(pr),
          name: capitalizeFirstLetter(pr),
        })),
      });
    }
  }

  return filters;
};

export default getFiltersPerGroup;
