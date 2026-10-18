export const SITE_NAME = "threejscomponents";
export const GITHUB_URL = "https://github.com/AbhiramKrishnaM";
export const THEME_STORAGE_KEY = "theme";

export interface NavLink {
  label: string;
  href: string;
  match?: readonly string[];
}

export const NAV_LINKS: NavLink[] = [
  { label: "Components", href: "/components/" },
  { label: "Docs", href: "/spacetime-grid/getting-started/", match: ["/spacetime-grid/", "/contribution-skyline/"] },
  { label: "Recipes", href: "/recipes/" },
];

export interface SearchEntry {
  title: string;
  href: string;
  group: string;
  description?: string;
}
