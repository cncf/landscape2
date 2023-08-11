export interface OutletContext {
  activeItemId?: string;
  updateActiveItemId: (itemId?: string) => void;
}

export interface BaseData {
  groups?: Group[];
  categories: Category[];
  categories_overridden?: string[];
  items: BaseItem[];
}

export interface Group {
  name: string;
  categories: string[];
}

export interface Category {
  name: string;
  subcategories: string[];
}

export interface BaseItem {
  id: string;
  category: string;
  has_repositories?: boolean;
  name: string;
  logo: string;
  subcategory: string;
  featured?: Featured;
  project?: string;
}

export interface Featured {
  label?: string;
  order?: number;
}

export interface Item extends BaseItem {
  accepted_at?: string;
  homepage_url?: string;
  artwork_url?: string;
  blog_url?: string;
  chat_channel?: string;
  clomonitor_name?: string;
  member_subcategory?: string;
  crunchbase_data?: Organization;
  crunchbase_url?: string;
  devstats_url?: string;
  discord_url?: string;
  docker_url?: string;
  enduser?: boolean;
  github_discussions_url?: string;
  graduated_at?: string;
  incubating_at?: string;
  joined_at?: string;
  mailing_list_url?: string;
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
  languages?: string[];
  latest_commit: Commit;
  latest_release?: Release;
  license: string;
  participation_stats: number[];
  stars: number;
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

export enum FilterCategory {
  Project = 'project',
  Organization = 'organization',
  License = 'license',
  Country = 'country',
  City = 'city',
  Region = 'region',
  Industry = 'industry',
  CompanyType = 'company-type',
}

export enum ViewMode {
  Grid = 'grid',
  Card = 'card',
}

export enum SVGIconKind {
  ArrowRight,
  ArrowTop,
  Artwork,
  Blog,
  Calendar,
  Clear,
  ClearCircle,
  Crunchbase,
  Discord,
  Discussions,
  Docker,
  Documentation,
  Filters,
  GitHub,
  GitHubCircle,
  Guide,
  Link,
  MailingList,
  NotImage,
  OpenssfBestPractices,
  Search,
  Slack,
  StackOverflow,
  Stats,
  Twitter,
  Youtube,
  Warning,
  World,
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
