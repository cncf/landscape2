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

export enum SVGIconKind {
  ArrowRight,
  ArrowTop,
  Artwork,
  Blog,
  Book,
  Calendar,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Check,
  Clear,
  ClearCircle,
  Close,
  Cocoapods,
  Copy,
  Crunchbase,
  CSV,
  Discord,
  Discussions,
  Docker,
  Documentation,
  Download,
  Embed,
  Erlang,
  ExternalLink,
  Facebook,
  Filters,
  Flickr,
  Flutter,
  Games,
  GitHub,
  GitHubCircle,
  Guide,
  Instagram,
  Link,
  LinkedIn,
  MagnifyingGlass,
  MailingList,
  MavenApache,
  Menu,
  NotImage,
  NPM,
  Nuget,
  OpenssfBestPractices,
  OsanoCookie,
  PackageManager,
  Packagist,
  PDF,
  Perl,
  Play,
  PNG,
  PyPi,
  Quiz,
  RubyGems,
  Rust,
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
