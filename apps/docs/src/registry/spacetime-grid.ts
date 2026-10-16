import poster from "@/assets/grid/idle.png";
import { pick, splitTheme } from "./demo";
import type { ComponentEntry, ControlSchema } from "./types";

export const spacetimeGrid: ComponentEntry = {
  slug: "spacetime-grid",
  name: "Spacetime Grid",
  category: "backgrounds",
  description: "A field of tiles with idle waves, a gravity well under the cursor and ripples on click.",
  keywords: ["background", "grid", "waves", "cursor", "ripple", "gravity well"],
  addedAt: "2026-10-15",
  packageName: "@abhiramkrishna/spacetime-grid",
  install: ["@abhiramkrishna/spacetime-grid", "three"],
  guideHref: "/spacetime-grid/",
  hint: "Move your cursor over the grid and click.",
  poster,
  snippet: {
    importPath: "@abhiramkrishna/spacetime-grid",
    name: "SpacetimeGrid",
    tag: "spacetime-grid",
    elementDefine: "defineSpacetimeGridElement",
    elementImport: "@abhiramkrishna/spacetime-grid/element",
    container: "el",
  },
  async load() {
    const { SpacetimeGrid, SPACETIME_GRID_SCHEMA } = await import("@abhiramkrishna/spacetime-grid");
    const schema = SPACETIME_GRID_SCHEMA as readonly ControlSchema[];
    return {
      schema,
      controls: pick(schema, [
        "waveAmplitude", "waveSpeed", "wellRadius", "wellDepth", "rippleSpeed", "rippleLifetime", "cols", "theme.hover", "theme.base",
      ]),
      async create(stage, values) {
        const { options, theme } = splitTheme(values);
        const grid = new SpacetimeGrid(stage, { ...options, compactBreakpoint: 0, theme });
        return {
          apply(entry, current) {
            const value = current[entry.key];
            if (entry.key.startsWith("theme.")) grid.setTheme({ [entry.key.slice(6)]: value });
            else grid.setOptions({ [entry.key]: value });
          },
          destroy: () => grid.destroy(),
        };
      },
    };
  },
};
