export interface Landscape {
  categories: Category[];
}

export interface Category {
  name: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  name: string;
  items: Item[];
}

export interface Item {
  name: string;
  description?: string;
  homepage_url: string;
  project?: string;
  repo_url: string;
  logo: string;
  twitter?: string;
  crunchbase?: string;
}

export interface FilterSection {
  key?: string;
  placeholder?: string;
  title: string;
  options: FilterOption[];
}

export interface FilterOption {
  name: string;
  value: string;
  suboptions?: FilterOption[];
}
