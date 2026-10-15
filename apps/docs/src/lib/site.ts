export const SITE_NAME = "threejscomponents";
export const GITHUB_URL = "https://github.com/AbhiramKrishnaM";
export const THEME_STORAGE_KEY = "theme";

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Spacetime grid", href: "/spacetime-grid/" },
  { label: "Contribution skyline", href: "/contribution-skyline/" },
];

export interface SearchEntry {
  title: string;
  href: string;
  group: string;
  description?: string;
}
