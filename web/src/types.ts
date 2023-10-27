export interface BaseData {
  foundation: string;
  guide_summary?: GuideSummary;
  images: {
    footer_logo?: string;
    header_logo: string;
  };
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
  social_networks?: {
    facebook?: string;
    flickr?: string;
    github?: string;
    instagram?: string;
    linkedin?: string;
    slack?: string;
    twitch?: string;
    twitter?: string;
    wechat?: string;
    youtube?: string;
  };
}

export interface Group {
  name: string;
  categories: string[];
}

export interface GuideSummary {
  [key: string]: string[];
}

export interface Category {
  name: string;
  subcategories: string[];
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
  clomonitor_report_summary?: string;
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
  audits?: SecurityAudit[];
}

export interface SecurityAudit {
  date: string;
  type: string;
  url: string;
  vendor: string;
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
  languages?: { [key: string]: number };
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

export enum FilterCategory {
  Maturity = 'project',
  Organization = 'organization',
  License = 'license',
  Country = 'country',
  City = 'city',
  Region = 'region',
  Industry = 'industry',
  CompanyType = 'company-type',
  TAG = 'tag',
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
  Close,
  Copy,
  Crunchbase,
  CSV,
  Discord,
  Discussions,
  Docker,
  Documentation,
  Download,
  Facebook,
  Filters,
  Flickr,
  GitHub,
  GitHubCircle,
  Guide,
  Instagram,
  Link,
  LinkedIn,
  MagnifyingGlass,
  MailingList,
  Menu,
  NotImage,
  OpenssfBestPractices,
  PDF,
  PNG,
  Search,
  Security,
  Slack,
  StackOverflow,
  Stats,
  ThreeBars,
  ToC,
  Twitch,
  Twitter,
  Youtube,
  Warning,
  WeChat,
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

export type FilterCategoriesPerTitle = {
  [key in FilterTitle]: FilterCategory[];
};

export enum ModalType {
  Item = 'item',
}
