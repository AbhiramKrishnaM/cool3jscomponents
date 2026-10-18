import type { ContributionData } from "@abhiramkrishna/contribution-skyline";
import poster from "@/assets/skyline/standalone.png";
import { pick, splitTheme } from "./demo";
import type { ComponentEntry, ControlSchema } from "./types";

export const contributionSkyline: ComponentEntry = {
  slug: "contribution-skyline",
  name: "Contribution Skyline",
  category: "data",
  description: "A GitHub contribution year as a 3D skyline of glowing bars that twinkle and burst into pixels.",
  keywords: ["github", "contributions", "chart", "bars", "particles", "calendar"],
  addedAt: "2026-10-15",
  packageName: "@abhiramkrishna/contribution-skyline",
  install: ["@abhiramkrishna/contribution-skyline", "three"],
  guideHref: "/contribution-skyline/",
  hint: "Drag Progress to watch the bars rise.",
  presets: [
    { id: "skyline", label: "Skyline", values: { barScale: 1.8, cameraElevation: 0.3 } },
    { id: "top-down", label: "Top-down", values: { barScale: 0.8, cameraElevation: 1.3 } },
    { id: "quiet", label: "Quiet", values: { twinkle: false, bursts: false } },
    { id: "fireworks", label: "Fireworks", values: { burstLevel: 2, barScale: 1.2 } },
    { id: "ember", label: "Ember", values: { "theme.hover": "#fea55f" } },
  ],
  poster,
  snippet: {
    importPath: "@abhiramkrishna/contribution-skyline",
    name: "ContributionSkyline",
    tag: "contribution-skyline",
    elementDefine: "defineContributionSkylineElement",
    elementImport: "@abhiramkrishna/contribution-skyline/element",
    container: "el",
    dataArgument: { js: "data", vue: ":data=\"data\"", react: "data={data}", element: "src=\"/contributions.json\"" },
  },
  async load() {
    const [{ ContributionSkyline, CONTRIBUTION_SKYLINE_SCHEMA }, { DEFAULT_THEME }] = await Promise.all([
      import("@abhiramkrishna/contribution-skyline"),
      import("@abhiramkrishna/spacetime-grid"),
    ]);
    const schema = CONTRIBUTION_SKYLINE_SCHEMA as readonly ControlSchema[];
    const hover: ControlSchema = {
      key: "theme.hover", label: "Colour", group: "Colours", type: "color", default: DEFAULT_THEME.hover,
      description: "Bar, glow and highlight colour.", live: true,
    };
    let data: Promise<ContributionData> | undefined;
    return {
      schema,
      controls: [
        ...pick(schema, ["progress", "barScale", "stagger", "twinkle", "bursts", "burstLevel", "floor", "cameraElevation"]),
        hover,
      ],
      async create(stage, values) {
        data ??= fetch("/data/contributions.json").then((res) => res.json() as Promise<ContributionData>);
        const { options, theme } = splitTheme(values);
        const skyline = new ContributionSkyline(stage, await data, { ...options, theme, grid: { compactBreakpoint: 0 } });
        return {
          apply(entry, current) {
            const value = current[entry.key];
            if (entry.key === "progress") skyline.setProgress(value as number);
            else if (entry.key.startsWith("theme.")) skyline.setTheme({ [entry.key.slice(6)]: value });
            else skyline.setOptions({ [entry.key]: value });
          },
          destroy: () => skyline.destroy(),
        };
      },
    };
  },
};
