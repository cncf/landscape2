import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import startCase from 'lodash/startCase';

import { REGEX_UNDERSCORE } from '../data';
import {
  Acquisition,
  AcquisitionData,
  CrunchbaseData,
  FilterCategory,
  FinancesData,
  FinancesFilters,
  FinancesKind,
  FundingData,
  FundingRound,
  Item,
} from '../types';

const prepareFinances = (crunchbaseData: CrunchbaseData, items: Item[]): FinancesData => {
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

  const getMembership = (url: string): string | undefined => {
    const item = items.find((item: Item) => {
      return item.crunchbase_url === url;
    });
    if (item) {
      return item.member_subcategory;
    } else {
      return;
    }
  };

  Object.keys(crunchbaseData).forEach((url: string) => {
    const data = crunchbaseData[url];
    const membership = getMembership(url);

    if (!isUndefined(data.funding_rounds) && !isEmpty(data.funding_rounds)) {
      if (data.name) {
        fundingOrg.push(data.name!);
      }
      if (!isUndefined(membership)) {
        fundingMemberships.push(membership);
      }
      data.funding_rounds!.forEach((round: FundingRound) => {
        const newItem = {
          ...round,
          organization_name: data.name!,
          crunchbase_url: url,
          membership: membership,
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
    if (!isUndefined(data.acquisitions) && !isEmpty(data.acquisitions)) {
      if (data.name) {
        acquisitionsAcq.push(data.name!);
      }
      if (!isUndefined(membership)) {
        acquisitionsMemberships.push(membership);
      }
      data.acquisitions!.forEach((acquisition: Acquisition) => {
        const newItem = {
          ...acquisition,
          organization_name: data.name!,
          crunchbase_url: url,
          membership: membership,
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
    funding: funding,
    acquisitions: acquisitions,
    filters: filters,
    firstDate: {
      [FinancesKind.Funding]: fundingDates.sort()[0],
      [FinancesKind.Acquisitions]: acquisitionsDates.sort()[0],
    },
  };
};

export default prepareFinances;
