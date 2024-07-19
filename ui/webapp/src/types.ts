export interface BaseData {
  base_path?: string;
  finances_available: boolean;
  games_available?: string[];
  foundation: string;
  guide_summary?: GuideSummary;
  colors?: {
    [key: string]: string;
  };
  grid_items_size?: string;
  groups?: Group[];
  categories: Category[];
  categories_overridden?: string[];
  items: BaseItem[];
  members_category?: string;
  qr_code?: string;
  upcoming_event?: Event;
  view_mode?: ViewMode;
  header?: HeaderContent;
  footer?: FooterContent;
}

export interface HeaderContent {
  links?: {
    github?: string;
  };
  logo?: string;
}

export interface FooterContent {
  links?: {
    facebook?: string;
    flickr?: string;
    homepage?: string;
    github?: string;
    instagram?: string;
    linkedin?: string;
    slack?: string;
    twitch?: string;
    twitter?: string;
    wechat?: string;
    youtube?: string;
  };
  logo?: string;
  text?: string;
}

export interface Group {
  name: string;
  normalized_name: string;
  categories: string[];
}

export interface GuideSummary {
  [key: string]: string[];
}

export interface Category {
  name: string;
  normalized_name: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  name: string;
  normalized_name: string;
}

export interface BaseItem {
  id: string;
  category: string;
  oss?: boolean;
  name: string;
  logo: string;
  subcategory: string;
  description?: string;
  featured?: Featured;
  maturity?: string;
  tag?: string;
  additional_categories?: AdditionalCategory[];
}

export interface Featured {
  label?: string;
  order?: number;
}

export interface Item extends BaseItem {
  website?: string;
  accepted_at?: string;
  homepage_url?: string;
  artwork_url?: string;
  blog_url?: string;
  chat_channel?: string;
  clomonitor_name?: string;
  clomonitor_report_summary?: string;
  member_subcategory?: string;
  crunchbase_data?: Organization;
  crunchbase_url?: string;
  devstats_url?: string;
  discord_url?: string;
  docker_url?: string;
  documentation_url?: string;
  enduser?: boolean;
  github_discussions_url?: string;
  graduated_at?: string;
  incubating_at?: string;
  archived_at?: string;
  joined_at?: string;
  mailing_list_url?: string;
  package_manager_url?: string;
  latest_annual_review_at?: string;
  latest_annual_review_url?: string;
  openssf_best_practices_url?: string;
  repositories?: Repository[];
  slack_url?: string;
  specification?: boolean;
  stack_overflow_url?: string;
  summary?: ItemSummary;
  twitter_url?: string;
  unnamed_organization?: boolean;
  youtube_url?: string;
  linkedin_url?: string;
  audits?: SecurityAudit[];
  parent_project?: string;
  other_links?: OtherLink[];
}

export interface OtherLink {
  name: string;
  url: string;
}

export interface SecurityAudit {
  date: string;
  type: string;
  url: string;
  vendor: string;
}

export interface AdditionalCategory {
  category: string;
  subcategory: string;
}

export interface Organization {
  city?: string;
  company_type?: string;
  country?: string;
  description?: string;
  funding?: number;
  generated_at?: number;
  homepage_url?: string;
  categories: string[];
  kind?: string;
  linkedin_url?: string;
  name?: string;
  num_employees_max?: number;
  num_employees_min?: number;
  region?: string;
  stock_exchange?: string;
  ticker?: string;
  twitter_url?: string;
  acquisitions?: Acquisition[];
  funding_rounds?: FundingRound[];
}

export interface Acquisition {
  announced_on?: string;
  acquiree_name?: string;
  acquiree_cb_permalink?: string;
  price?: number;
}

export interface FundingRound {
  amount?: number;
  announced_on?: string;
  kind?: string;
}

export interface ItemSummary {
  business_use_case?: string;
  integration?: string;
  integrations?: string;
  intro_url?: string;
  personas?: string[];
  release_rate?: string;
  tags: string[];
  use_case?: string;
}

export interface Repository {
  url: string;
  branch?: string;
  github_data?: GithubRepository;
  primary: boolean;
}

export interface GithubRepository {
  contributors: Contributors;
  description: string;
  first_commit: Commit;
  generated_at: number;
  languages?: { [key: string]: number };
  latest_commit: Commit;
  latest_release?: Release;
  license: string;
  participation_stats: number[];
  stars: number;
  topics: string[];
  url: string;
}

export interface Contributors {
  count: number;
  url: string;
}

export interface Commit {
  ts: string;
  url: string;
}

export interface Release {
  ts: string;
  url: string;
}

export interface LandscapeData {
  categories: Category[];
  items?: Item[];
  crunchbase_data?: CrunchbaseData;
  github_data?: GithubData;
}

export interface CrunchbaseData {
  [key: string]: Organization;
}

export interface GithubData {
  [key: string]: GithubRepository;
}

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

export interface Guide {
  categories: CategoryGuide[];
}

export interface CategoryGuide {
  category: string;
  content?: string;
  subcategories: SubcategoryGuide[];
  keywords?: string[];
}

export interface SubcategoryGuide {
  subcategory: string;
  content: string;
  keywords?: string[];
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
  City = 'city',
  Region = 'region',
  Industry = 'industry',
  OrgType = 'org-type',
  TAG = 'tag',
  Membership = 'membership',
  InvestmentType = 'investment-type',
  Category = 'category',
  Extra = 'extra',
  ProjectMaturity = 'maturity',
}

export interface Stats {
  members?: {
    joined_at: { [key: string]: number };
    joined_at_rt: { [key: string]: number };
    members: number;
    subcategories: { [key: string]: number };
  };
  projects?: {
    accepted_at: { [key: string]: number };
    accepted_at_rt: { [key: string]: number };
    audits: { [key: string]: number };
    audits_rt: { [key: string]: number };
    incubating_to_graduated: { [key: string]: number };
    maturity: { [key: string]: number };
    projects: number;
    sandbox_to_incubating: { [key: string]: number };
    category: {
      [key: string]: CategoryValueStats;
    };
    tag?: {
      [key: string]: number;
    };
  };
  repositories?: {
    bytes: number;
    contributors: number;
    languages: { [key: string]: number };
    languages_bytes: { [key: string]: number };
    licenses: { [key: string]: number };
    participation_stats: number[];
    repositories: number;
    stars: number;
  };
  organizations?: {
    acquisitions: { [key: string]: number };
    acquisitions_price: { [key: string]: number };
    funding_rounds: { [key: string]: number };
    funding_rounds_money_raised: { [key: string]: number };
  };
}

export interface CategoryValueStats {
  projects: number;
  subcategories: {
    [key: string]: number;
  };
}

export interface Event {
  name: string;
  start: string;
  end: string;
  details_url: string;
  banner_url: string;
}

export enum ViewMode {
  Grid = 'grid',
  Card = 'card',
}

export enum FinancesKind {
  Funding = 'funding',
  Acquisitions = 'acquisitions',
}

export enum Breakpoint {
  XXXL = 'xxxl',
  XXL = 'xxl',
  XL = 'xl',
  LG = 'lg',
  MD = 'md',
  SM = 'sm',
  XS = 'xs',
}

export enum GridItemsSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

export type ZoomLevelsPerSize = {
  [key in GridItemsSize]: number[][];
};

export enum SocialNetwork {
  Facebook = 'facebook',
  Flickr = 'flickr',
  GitHub = 'github',
  Instagram = 'instagram',
  LinkedIn = 'linkedin',
  Slack = 'slack',
  Twitch = 'twitch',
  Twitter = 'twitter',
  WeChat = 'wechat',
  Youtube = 'youtube',
}

export enum Tab {
  Explore = 'explore',
  Guide = 'guide',
  Stats = 'stats',
}

export enum FilterTitle {
  Project = 'Project',
  Organization = 'Organization',
}

export enum ClassifyOption {
  None = 'none',
  Category = 'category',
  Maturity = 'maturity',
  Tag = 'tag',
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

export enum ModalType {
  Item = 'item',
}
