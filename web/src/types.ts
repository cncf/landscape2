export interface OutletContext {
  activeItem?: Item;
  setActiveItem: (value?: Item) => void;
}

export interface Landscape {
  groups?: Group[];
  categories: Category[];
  categories_overridden?: string[];
  featured_items: FeatureItem[];
  items: Item[];
}

export interface Group {
  name: string;
  categories: string[];
}

export interface Category {
  name: string;
  subcategories: string[];
}

export interface Item {
  category: string;
  has_repositories: boolean;
  name: string;
  logo: string;
  subcategory: string;
  project?: string;
}

export interface DetailedItem extends Item {
  isFeatured: boolean;
  order?: number;
  label?: string;
}

export interface FeatureItem {
  field: string;
  options: FeatureItemOption[];
}

export interface FeatureItemOption {
  value: string;
  order?: number;
  label?: string;
}

export interface FilterSection {
  value: FilterCategory;
  placeholder?: string;
  title: string;
  options: FilterOption[];
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

export enum FilterCategory {
  Project = 'project'
}

export enum ViewMode {
  Grid = 'grid',
  Card = 'card',
}
