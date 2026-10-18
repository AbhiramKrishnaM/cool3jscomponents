import { getCollection } from "astro:content";
import type { SearchEntry } from "@/lib/site";
import { COMPONENTS, componentHref } from "@/registry";

const SECTIONS = [
  { id: "spacetime-grid", label: "Spacetime grid" },
  { id: "contribution-skyline", label: "Contribution skyline" },
];

function pageRank(id: string, section: string) {
  if (id === section) return 0;
  if (id === `${section}/getting-started`) return 1;
  return id.startsWith(`${section}/frameworks/`) ? 3 : 2;
}

export async function getSearchEntries(): Promise<SearchEntry[]> {
  const docs = await getCollection("docs");
  const guides = docs
    .filter((doc) => doc.id !== "index")
    .map((doc) => {
      const section = doc.id.split("/")[0] ?? "";
      const sectionIndex = SECTIONS.findIndex((entry) => entry.id === section);
      return {
        entry: {
          title: doc.id === section ? `${doc.data.title} overview` : doc.data.sidebar?.label ?? doc.data.title,
          href: `/${doc.id}/`,
          group: SECTIONS[sectionIndex]?.label ?? "Guides",
          description: doc.data.description,
        },
        order: [sectionIndex < 0 ? SECTIONS.length : sectionIndex, pageRank(doc.id, section)],
      };
    })
    .sort((a, b) => a.order[0]! - b.order[0]! || a.order[1]! - b.order[1]! || a.entry.href.localeCompare(b.entry.href))
    .map(({ entry }) => entry);
  const components = COMPONENTS.map((component) => ({
    title: component.name,
    href: componentHref(component),
    group: "Components",
    description: component.description,
  }));
  return [...components, ...guides];
}
