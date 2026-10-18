import { getCollection, type CollectionEntry } from "astro:content";

export type Guide = CollectionEntry<"docs">;

export interface NavItem {
  label: string;
  href: string;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
  frameworks: NavItem[];
}

export const GUIDE_SECTIONS = [
  { id: "spacetime-grid", label: "Spacetime grid" },
  { id: "contribution-skyline", label: "Contribution skyline" },
] as const;

export const guideHref = (id: string): string => `/${id}/`;

const order = (guide: Guide): number => (guide.id.split("/").length === 1 ? 0 : guide.data.sidebar?.order ?? 99);
const label = (guide: Guide): string => guide.data.sidebar?.label ?? guide.data.title;

export async function getGuideNav(): Promise<NavSection[]> {
  const guides = await getCollection("docs");
  return GUIDE_SECTIONS.map((section) => {
    const own = guides
      .filter((guide) => guide.id === section.id || guide.id.startsWith(`${section.id}/`))
      .sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id));
    const toItem = (guide: Guide): NavItem => ({ label: label(guide), href: guideHref(guide.id) });
    return {
      ...section,
      items: own.filter((guide) => !guide.id.startsWith(`${section.id}/frameworks/`)).map(toItem),
      frameworks: own.filter((guide) => guide.id.startsWith(`${section.id}/frameworks/`)).map(toItem),
    };
  });
}

export function flatten(nav: readonly NavSection[]): NavItem[] {
  return nav.flatMap((section) => [...section.items, ...section.frameworks]);
}
