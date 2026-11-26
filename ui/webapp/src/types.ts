import type { Acquisition, BaseItem, FundingRound, GridItemsSize, Item } from 'common';

// Dataset types and enum objects shared through common, re-exported for the
// webapp modules that import them from here
export type {
  Acquisition,
  AdditionalCategory,
  BaseData,
  BaseItem,
  Category,
  CategoryProjectsStats,
  ClassificationOption,
  Commit,
  Contributors,
  Featured,
  Footer,
  FooterLinks,
  FullDataset,
  FundingRound,
  GithubRepository,
  Group,
  Guide,
  GuideCategory,
  GuideSubcategory,
  Header,
  Item,
  ItemSummary,
  Organization,
  OtherLink,
  Release,
  Repository,
  SecurityAudit,
  Stats,
  Subcategory,
  UpcomingEvent,
} from 'common';
export { GridItemsSize, ViewMode } from 'common';

/**
 * Item from the base dataset that carries the full dataset fields once they are
 * loaded: the webapp renders the base items until the full dataset is ready.
 */
export type LandscapeItem = BaseItem & Partial<Item>;

export interface FilterSection {
  value: FilterCategory;
  placeholder?: string;
  title: string;
  options: FilterOption[];
  extra?: {
    [key: string]: string[];
  };
}

export interface ActiveSection {
  category: string;
  subcategory: string;
  bgColor?: string;
}

export interface Option {
  name: string;
  value: string;
}

export interface FilterOption extends Option {
  suboptions?: FilterOption[];
}

export type ActiveFilters = {
  [key in FilterCategory]?: string[];
};

export interface CardMenu {
  [key: string]: string[];
}

export interface ToCTitle {
  title: string;
  id: string;
  options?: ToCTitle[];
}

export interface FinancesData {
  [FinancesKind.Funding]: FundingData[];
  [FinancesKind.Acquisitions]: AcquisitionData[];
  filters: FinancesFilters;
  firstDate: {
    [FinancesKind.Funding]: string;
    [FinancesKind.Acquisitions]: string;
  };
}

export interface FinancesFilters {
  [FinancesKind.Funding]: FilterSection[];
  [FinancesKind.Acquisitions]: FilterSection[];
}

export interface FundingData extends FundingRound {
  organization_name: string;
  crunchbase_url?: string;
  membership?: string;
}

export interface AcquisitionData extends Acquisition {
  organization_name: string;
  crunchbase_url?: string;
  membership?: string;
}

export interface StateContent {
  from?: string;
}

export enum FilterCategory {
  Maturity = 'project',
  Organization = 'organization',
  License = 'license',
  Country = 'country',
  Industry = 'industry',
  OrgType = 'org-type',
  TAG = 'tag',
  Membership = 'membership',
  InvestmentType = 'investment-type',
  Category = 'category',
  Extra = 'extra',
  ProjectMaturity = 'maturity',
}

export enum FinancesKind {
  Funding = 'funding',
  Acquisitions = 'acquisitions',
}

export type ZoomLevelsPerSize = {
  [key in GridItemsSize]: number[][];
};

export enum FilterTitle {
  Project = 'Project',
  Organization = 'Organization',
}

export enum ClassifyOption {
  None = 'none',
  Category = 'category',
  Maturity = 'maturity',
  TAG = 'tag',
}

export enum SortOption {
  Name = 'name',
  Stars = 'stars',
  DateAdded = 'date-added',
  Contributors = 'contributors',
  FirstCommit = 'first-commit',
  LatestCommit = 'latest-commit',
  Funding = 'funding',
}

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

export type FilterCategoriesPerTitle = {
  [key in FilterTitle]: FilterCategory[];
};
