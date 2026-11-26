import { capitalizeFirstLetter, formatTAGName } from 'common';
import isUndefined from 'lodash/isUndefined';

import { FilterCategory, FilterSection, LandscapeItem } from '../types';
import checkIfCategoryInGroup from './checkIfCategoryInGroup';
import getRepositoryLicenses from './getRepositoryLicenses';
import itemsDataGetter from './itemsDataGetter';

export interface FiltersPerGroup {
  [key: string]: PreparedFilters;
}

export interface FiltersOptions {
  itemsWithoutMaturity: boolean;
  itemsWithoutLicense: boolean;
}

interface PreparedFilters {
  filters: FilterSection[];
  options: FiltersOptions;
}

/** Prepares the filter sections and options of every group, from its grouped items. */
const getFiltersPerGroup = () => {
  const groups: FiltersPerGroup = {};

  const groupedItems = itemsDataGetter.getGroupedData();
  Object.keys(groupedItems).forEach((group: string) => {
    groups[group] = { ...prepareFilters(groupedItems[group], group) };
  });

  return groups;
};

/**
 * Prepares the filter sections available for the items of a group, plus the flags
 * that tell whether some items lack a maturity or a license.
 *
 * @param items - Items of the group
 * @param group - Normalized name of the group, whose categories limit the Category section
 * @returns The filter sections and options
 */
export const prepareFilters = (items: LandscapeItem[], group: string): PreparedFilters => {
  const filters: FilterSection[] = [];

  const maturityTypes: string[] = [];
  const tags: string[] = [];
  const organizations: string[] = [];
  const licenses: string[] = [];
  const countries: string[] = [];
  const companyTypes: string[] = [];
  const extraTypes: string[] = [];
  const categories: string[] = [];
  const industry: string[] = [];
  let itemsWithoutMaturity: boolean = false;
  let nonOss: boolean = false;

  items.forEach((i: LandscapeItem) => {
    if (i.maturity) {
      maturityTypes.push(i.maturity);
    } else {
      itemsWithoutMaturity = true;
    }

    if (i.tag) {
      i.tag.forEach((t) => {
        tags.push(t);
      });
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
        industry.push(...i.crunchbase_data.categories);
      }

      if (i.crunchbase_data.company_type) {
        companyTypes.push(i.crunchbase_data.company_type);
      }
    }

    licenses.push(...getRepositoryLicenses(i.repositories));

    if (isUndefined(i.oss)) {
      nonOss = true;
    }
  });

  if (maturityTypes.length > 0) {
    filters.push({
      value: FilterCategory.Maturity,
      title: 'Project',
      options: [...new Set(maturityTypes)].sort().map((pr: string) => ({
        value: pr,
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
        value: org,
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
        options: cleanCategories.map((cat: string) => ({
          value: cat,
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
        value: license,
        name: license,
      })),
    });
  }

  if (countries.length > 0) {
    filters.push({
      value: FilterCategory.Country,
      title: 'Country',
      options: [...new Set(countries)].sort().map((country: string) => ({
        value: country,
        name: country,
      })),
    });
  }

  if (industry.length > 0) {
    filters.push({
      value: FilterCategory.Industry,
      title: 'Industry',
      options: [...new Set(industry)].sort().map((i: string) => ({
        value: i,
        name: i,
      })),
    });
  }

  if (companyTypes.length > 0) {
    filters.push({
      value: FilterCategory.OrgType,
      title: 'Organization type',
      options: [...new Set(companyTypes)].sort().map((ot: string) => ({
        value: ot,
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
      options,
    });
  }

  return { filters, options: { itemsWithoutMaturity, itemsWithoutLicense: nonOss } };
};

export default getFiltersPerGroup;
