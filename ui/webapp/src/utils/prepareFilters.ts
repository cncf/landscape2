import { capitalizeFirstLetter, formatTAGName } from 'common';

import { FilterCategory, FilterSection, Item, Repository } from '../types';
import checkIfCategoryInGroup from './checkIfCategoryInGroup';
import itemsDataGetter from './itemsDataGetter';

const cleanValue = (t: string): string => {
  // return encodeURIComponent(t);
  return t;
};

export interface FiltersPerGroup {
  [key: string]: FilterSection[];
}

const getFiltersPerGroup = () => {
  const groups: FiltersPerGroup = {};

  const groupedItems = itemsDataGetter.getGroupedData();
  Object.keys(groupedItems).forEach((group: string) => {
    groups[group] = prepareFilters(groupedItems[group], group);
  });

  return groups;
};

const prepareFilters = (items: Item[], group: string): FilterSection[] => {
  const filters: FilterSection[] = [];

  const maturityTypes: string[] = [];
  const tags: string[] = [];
  const organizations: string[] = [];
  const licenses: string[] = [];
  const countries: string[] = [];
  const companyTypes: string[] = [];
  const extraTypes: string[] = [];
  const categories: string[] = [];
  let industry: string[] = [];

  items.forEach((i: Item) => {
    if (i.maturity) {
      maturityTypes.push(i.maturity);
    }

    if (i.tag) {
      tags.push(i.tag);
    }

    if (i.specification) {
      extraTypes.push('specification');
    }

    if (i.enduser) {
      extraTypes.push('enduser');
    }

    if (i.category && checkIfCategoryInGroup(i.category, group)) {
      categories.push(i.category);
    }

    if (i.additional_categories) {
      i.additional_categories.forEach((ac) => {
        if (checkIfCategoryInGroup(ac.category, group)) {
          categories.push(ac.category);
        }
      });
    }

    if (i.crunchbase_data) {
      if (i.crunchbase_data.name) {
        organizations.push(i.crunchbase_data.name);
      }

      if (i.crunchbase_data.country) {
        countries.push(i.crunchbase_data.country);
      }

      if (i.crunchbase_data.categories) {
        industry = [...industry, ...i.crunchbase_data.categories];
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

  if (tags.length > 0) {
    filters.push({
      value: FilterCategory.TAG,
      title: 'TAG',
      options: [...new Set(tags)].sort().map((tag: string) => ({
        value: tag,
        name: formatTAGName(tag),
      })),
    });
  }

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

  if (categories.length > 0) {
    const cleanCategories = [...new Set(categories)].sort();

    // Add categories filter only if there are more than one category
    if (cleanCategories.length > 1) {
      filters.push({
        value: FilterCategory.Category,
        title: 'Category',
        options: [...new Set(categories)].sort().map((cat: string) => ({
          value: cleanValue(cat),
          name: cat,
        })),
      });
    }
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

  if (industry.length > 0) {
    filters.push({
      value: FilterCategory.Industry,
      title: 'Industry',
      options: [...new Set(industry)].sort().map((i: string) => ({
        value: cleanValue(i),
        name: i,
      })),
    });

    if (companyTypes.length > 0) {
      filters.push({
        value: FilterCategory.OrgType,
        title: 'Organization type',
        options: [...new Set(companyTypes)].sort().map((ot: string) => ({
          value: cleanValue(ot),
          name: ot,
        })),
      });
    }

    if (extraTypes.length > 0) {
      const options = [];
      if (extraTypes.includes('enduser')) {
        options.push({
          value: 'enduser',
          name: 'End user',
        });
      }
      if (extraTypes.includes('specification')) {
        options.push({
          value: 'specification',
          name: 'Specification',
        });
      }
      filters.push({
        value: FilterCategory.Extra,
        title: 'Extra',
        options: options,
      });
    }
  }

  return filters;
};

export default getFiltersPerGroup;
