import intersection from 'lodash/intersection';
import isUndefined from 'lodash/isUndefined';

import { FOUNDATION } from '../data';
import { ActiveFilters, FilterCategory, LandscapeItem } from '../types';
import getFoundationNameLabel from './getFoundationNameLabel';
import getRepositoryLicenses from './getRepositoryLicenses';

/** Returns the items that match every active filter (all of them when no filter is active). */
const filterData = <T extends LandscapeItem>(items: T[], activeFilters: ActiveFilters): T[] => {
  if (Object.keys(activeFilters).length > 0) {
    const filteredItems: T[] = items.filter((item: T) => {
      // Filter Extra
      if (activeFilters[FilterCategory.Extra]) {
        if (
          activeFilters[FilterCategory.Extra].includes('specification') &&
          (isUndefined(item.specification) || !item.specification)
        ) {
          return false;
        }

        if (activeFilters[FilterCategory.Extra].includes('enduser') && (isUndefined(item.enduser) || !item.enduser)) {
          return false;
        }
      }

      // Filter Category
      if (activeFilters[FilterCategory.Category]) {
        const additional_categories = item.additional_categories
          ? item.additional_categories.map((c) => c.category)
          : [];
        if (isUndefined(item.category)) {
          return false;
        } else if (
          !activeFilters[FilterCategory.Category].includes(item.category) &&
          !activeFilters[FilterCategory.Category].some((c) => additional_categories.includes(c))
        ) {
          return false;
        }
      }

      // Filter Organization
      if (activeFilters[FilterCategory.Organization]) {
        if (isUndefined(item.crunchbase_data) || isUndefined(item.crunchbase_data.name)) {
          return false;
        } else if (!activeFilters[FilterCategory.Organization].includes(item.crunchbase_data.name)) {
          return false;
        }
      }

      // Filter Country
      if (activeFilters[FilterCategory.Country]) {
        if (isUndefined(item.crunchbase_data) || isUndefined(item.crunchbase_data.country)) {
          return false;
        } else if (!activeFilters[FilterCategory.Country].includes(item.crunchbase_data.country)) {
          return false;
        }
      }

      // Filter Industry
      if (activeFilters[FilterCategory.Industry]) {
        if (isUndefined(item.crunchbase_data) || isUndefined(item.crunchbase_data.categories)) {
          return false;
        } else if (
          !item.crunchbase_data.categories.some((c: string) => activeFilters[FilterCategory.Industry]?.includes(c))
        ) {
          return false;
        }
      }

      // License License
      if (activeFilters[FilterCategory.License]) {
        if (isUndefined(item.oss) && !activeFilters[FilterCategory.License].includes('non-oss')) {
          return false;
        } else {
          if (!isUndefined(item.oss)) {
            if (isUndefined(item.repositories)) {
              return false;
            } else {
              const licenses = getRepositoryLicenses(item.repositories);
              if (!licenses.some((l: string) => activeFilters[FilterCategory.License]?.includes(l))) {
                return false;
              }
            }
          }
        }
      }

      // Filter CompanyType
      if (activeFilters[FilterCategory.OrgType]) {
        if (isUndefined(item.crunchbase_data) || isUndefined(item.crunchbase_data.company_type)) {
          return false;
        } else if (!activeFilters[FilterCategory.OrgType].includes(item.crunchbase_data.company_type)) {
          return false;
        }
      }

      // Filter TAG
      if (activeFilters[FilterCategory.TAG]) {
        if (isUndefined(item.tag)) {
          return false;
        } else if (intersection(activeFilters[FilterCategory.TAG], item.tag).length === 0) {
          return false;
        }
      }

      //  Maturity filter
      if (activeFilters[FilterCategory.Maturity]) {
        if (
          isUndefined(item.maturity) &&
          !activeFilters[FilterCategory.Maturity].includes(`non-${getFoundationNameLabel(FOUNDATION)}`)
        ) {
          return false;
        } else {
          if (!isUndefined(item.maturity)) {
            if (!activeFilters[FilterCategory.Maturity].includes(item.maturity)) {
              return false;
            }
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
