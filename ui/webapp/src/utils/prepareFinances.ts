import { REGEX_UNDERSCORE } from 'common';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import startCase from 'lodash/startCase';

import {
  Acquisition,
  AcquisitionData,
  FilterCategory,
  FinancesData,
  FinancesFilters,
  FinancesKind,
  FullDataset,
  FundingData,
  FundingRound,
  Item,
} from '../types';

/**
 * Prepares the finances data from the Crunchbase data: the funding rounds and acquisitions
 * with their organization and membership, the filters of each kind and their first dates.
 */
const prepareFinances = (crunchbaseData: NonNullable<FullDataset['crunchbase_data']>, items: Item[]): FinancesData => {
  const funding: FundingData[] = [];
  const acquisitions: AcquisitionData[] = [];
  const fundingMemberships: string[] = [];
  const fundingOrg: string[] = [];
  const acquisitionsAcq: string[] = [];
  const acquisitionsMemberships: string[] = [];
  const investmentTypes: string[] = [];
  const filters: FinancesFilters = {
    [FinancesKind.Funding]: [],
    [FinancesKind.Acquisitions]: [],
  };
  const fundingDates: string[] = [];
  const acquisitionsDates: string[] = [];

  // Items by Crunchbase url, built once, keeping the first item of each organization
  const itemsByCrunchbaseUrl = new Map<string, Item>();
  items.forEach((item: Item) => {
    if (!isUndefined(item.crunchbase_url) && !itemsByCrunchbaseUrl.has(item.crunchbase_url)) {
      itemsByCrunchbaseUrl.set(item.crunchbase_url, item);
    }
  });

  const getMembership = (url: string): string | undefined => itemsByCrunchbaseUrl.get(url)?.member_subcategory;

  Object.keys(crunchbaseData).forEach((url: string) => {
    const data = crunchbaseData[url];
    const membership = getMembership(url);

    const fundingRounds = data.funding_rounds;
    if (!isUndefined(fundingRounds) && !isEmpty(fundingRounds)) {
      if (data.name) {
        fundingOrg.push(data.name);
      }
      if (!isUndefined(membership)) {
        fundingMemberships.push(membership);
      }
      fundingRounds.forEach((round: FundingRound) => {
        const newItem = {
          ...round,
          organization_name: data.name!,
          crunchbase_url: url,
          membership,
        };
        funding.push(newItem);
        if (round.kind) {
          investmentTypes.push(round.kind);
        }
        if (round.announced_on) {
          fundingDates.push(round.announced_on);
        }
      });
    }
    const dataAcquisitions = data.acquisitions;
    if (!isUndefined(dataAcquisitions) && !isEmpty(dataAcquisitions)) {
      if (data.name) {
        acquisitionsAcq.push(data.name);
      }
      if (!isUndefined(membership)) {
        acquisitionsMemberships.push(membership);
      }
      dataAcquisitions.forEach((acquisition: Acquisition) => {
        const newItem = {
          ...acquisition,
          organization_name: data.name!,
          crunchbase_url: url,
          membership,
        };
        acquisitions.push(newItem);

        if (acquisition.announced_on) {
          acquisitionsDates.push(acquisition.announced_on);
        }
      });
    }
  });

  if (fundingOrg.length > 0) {
    filters[FinancesKind.Funding].push({
      value: FilterCategory.Organization,
      title: 'Organization',
      options: [...new Set(fundingOrg)].sort().map((org: string) => ({
        value: org,
        name: org,
      })),
    });
  }

  if (fundingMemberships.length > 0) {
    filters[FinancesKind.Funding].push({
      value: FilterCategory.Membership,
      title: 'Membership',
      options: [...new Set(fundingMemberships)].sort().map((ms: string) => ({
        value: ms,
        name: ms,
      })),
    });
  }

  if (investmentTypes.length > 0) {
    filters[FinancesKind.Funding].push({
      value: FilterCategory.InvestmentType,
      title: 'Investment type',
      options: [...new Set(investmentTypes)].sort().map((kind: string) => ({
        value: kind,
        name: startCase(kind.replace(REGEX_UNDERSCORE, ' ')),
      })),
    });
  }

  if (acquisitionsAcq.length > 0) {
    filters[FinancesKind.Acquisitions].push({
      value: FilterCategory.Organization,
      title: 'Organization',
      options: [...new Set(acquisitionsAcq)].sort().map((org: string) => ({
        value: org,
        name: org,
      })),
    });
  }

  if (acquisitionsMemberships.length > 0) {
    filters[FinancesKind.Acquisitions].push({
      value: FilterCategory.Membership,
      title: 'Membership',
      options: [...new Set(acquisitionsMemberships)].sort().map((ms: string) => ({
        value: ms,
        name: ms,
      })),
    });
  }

  return {
    funding,
    acquisitions,
    filters,
    firstDate: {
      [FinancesKind.Funding]: fundingDates.sort()[0],
      [FinancesKind.Acquisitions]: acquisitionsDates.sort()[0],
    },
  };
};

export default prepareFinances;
