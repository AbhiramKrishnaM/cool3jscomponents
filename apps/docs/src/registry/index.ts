import { contributionSkyline } from "./contribution-skyline";
import { spacetimeGrid } from "./spacetime-grid";
import type { Badge, Category, ComponentEntry } from "./types";

export type { Badge, Category, ComponentEntry, ControlSchema, DemoInstance, Framework, LoadedComponent, Preset, Values } from "./types";
export { snippet, type SnippetSpec } from "./snippet";
export { defaultValues } from "./demo";

const DAY = 86_400_000;
const NEW_FOR_DAYS = 60;
const UPDATED_FOR_DAYS = 30;

export const CATEGORIES: readonly Category[] = [
  { id: "backgrounds", label: "Backgrounds" },
  { id: "data", label: "Data" },
];

export const COMPONENTS: readonly ComponentEntry[] = [spacetimeGrid, contributionSkyline];

export function getComponent(slug: string): ComponentEntry | undefined {
  return COMPONENTS.find((entry) => entry.slug === slug);
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

export function componentsByCategory(): { category: Category; components: ComponentEntry[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    components: COMPONENTS.filter((entry) => entry.category === category.id),
  })).filter((group) => group.components.length > 0);
}

export function neighbours(slug: string): { previous?: ComponentEntry; next?: ComponentEntry } {
  const ordered = componentsByCategory().flatMap((group) => group.components);
  const index = ordered.findIndex((entry) => entry.slug === slug);
  if (index < 0) return {};
  return { previous: ordered[index - 1], next: ordered[index + 1] };
}

export function badgeFor(entry: ComponentEntry, now: number = Date.now()): Badge | undefined {
  const age = (date: string) => (now - Date.parse(date)) / DAY;
  if (age(entry.addedAt) <= NEW_FOR_DAYS) return "new";
  if (entry.updatedAt && age(entry.updatedAt) <= UPDATED_FOR_DAYS) return "updated";
  return undefined;
}

export function componentHref(entry: ComponentEntry): string {
  return `/components/${entry.slug}/`;
}
