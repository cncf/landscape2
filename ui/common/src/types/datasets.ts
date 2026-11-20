import type {
  FullItem,
  FullRepository,
  GridItemsSize as GeneratedGridItemsSize,
  ItemAudit,
  ItemFeatured,
  ItemLink,
  Organization,
  RepositoryGithubData,
  ViewMode as GeneratedViewMode,
} from './generated';

/**
 * Resolves to `T` when `Missing` is `never`, and fails to compile otherwise.
 * It ties the runtime enum objects below to the generated unions, so a new
 * Rust variant without its object member fails the type-check.
 */
type Exhaustive<T, Missing extends never> = [Missing] extends [never] ? T : never;

/** Grid items sizes, the runtime values of the generated `GridItemsSize` union. */
export const GridItemsSize = {
  Large: 'large',
  Medium: 'medium',
  Small: 'small',
} as const satisfies Record<string, GeneratedGridItemsSize>;

/** Grid items size, as generated from the Rust datasets. */
export type GridItemsSize = Exhaustive<
  GeneratedGridItemsSize,
  Exclude<GeneratedGridItemsSize, (typeof GridItemsSize)[keyof typeof GridItemsSize]>
>;

/** View modes, the runtime values of the generated `ViewMode` union, in the order of the Explore view mode buttons. */
export const ViewMode = {
  Grid: 'grid',
  Card: 'card',
} as const satisfies Record<string, GeneratedViewMode>;

/** View mode, as generated from the Rust datasets. */
export type ViewMode = Exhaustive<
  GeneratedViewMode,
  Exclude<GeneratedViewMode, (typeof ViewMode)[keyof typeof ViewMode]>
>;

/** Item featured information. */
export type Featured = ItemFeatured;

/** Repository information collected from GitHub. */
export type GithubRepository = RepositoryGithubData;

/** Item with the Crunchbase and GitHub data joined from the full dataset on the client. */
export type Item = Omit<FullItem, 'repositories'> & {
  crunchbase_data?: Organization;
  repositories?: Repository[];
};

/** Item link featured in its details view. */
export type OtherLink = ItemLink;

/** Repository with the GitHub data joined from the full dataset on the client. */
export type Repository = FullRepository & { github_data?: RepositoryGithubData };

/** Item security audit. */
export type SecurityAudit = ItemAudit;
