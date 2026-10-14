import { createPanel } from "./panel";
import { snippet, type SnippetSpec } from "./snippet";
import type { ControlSchema, Framework, Values } from "./types";

const FRAMEWORK_LABELS: Record<Framework, string> = { js: "JavaScript", vue: "Vue", react: "React", element: "Web Component" };
const SYNC_KEY = "starlight-synced-tabs__framework";

interface Instance {
  apply(entry: ControlSchema, values: Values): void;
  destroy(): void;
}

interface Kind {
  controls: readonly ControlSchema[];
  spec: SnippetSpec;
  create(stage: HTMLElement, values: Values): Promise<Instance>;
}

function pick(schema: readonly ControlSchema[], keys: readonly string[]): ControlSchema[] {
  return keys.map((key) => {
    const entry = schema.find((candidate) => candidate.key === key);
    if (!entry) throw new Error(`Unknown option ${key}`);
    return entry;
  });
}

function splitTheme(values: Values): { options: Values; theme: Record<string, unknown> } {
  const options: Values = {};
  const theme: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith("theme.")) theme[key.slice(6)] = value;
    else options[key] = value;
  }
  return { options, theme };
}

async function gridKind(): Promise<Kind> {
  const { SpacetimeGrid, SPACETIME_GRID_SCHEMA } = await import("@abhiramkrishna/spacetime-grid");
  const controls = pick(SPACETIME_GRID_SCHEMA as readonly ControlSchema[], [
    "waveAmplitude", "waveSpeed", "wellRadius", "wellDepth", "rippleSpeed", "rippleLifetime", "cols", "theme.hover", "theme.base",
  ]);
  return {
    controls,
    spec: {
      importPath: "@abhiramkrishna/spacetime-grid",
      name: "SpacetimeGrid",
      tag: "spacetime-grid",
      elementDefine: "defineSpacetimeGridElement",
      elementImport: "@abhiramkrishna/spacetime-grid/element",
      container: "el",
    },
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
}

async function skylineKind(): Promise<Kind> {
  const [{ ContributionSkyline, CONTRIBUTION_SKYLINE_SCHEMA }, { DEFAULT_THEME }, data] = await Promise.all([
    import("@abhiramkrishna/contribution-skyline"),
    import("@abhiramkrishna/spacetime-grid"),
    fetch("/data/contributions.json").then((res) => res.json()),
  ]);
  const hover: ControlSchema = {
    key: "theme.hover", label: "Colour", group: "Colours", type: "color", default: DEFAULT_THEME.hover,
    description: "Bar, glow and highlight colour.", live: true,
  };
  const controls = [
    ...pick(CONTRIBUTION_SKYLINE_SCHEMA as readonly ControlSchema[], ["progress", "barScale", "stagger", "twinkle", "bursts", "burstLevel", "floor", "cameraElevation"]),
    hover,
  ];
  return {
    controls,
    spec: {
      importPath: "@abhiramkrishna/contribution-skyline",
      name: "ContributionSkyline",
      tag: "contribution-skyline",
      elementDefine: "defineContributionSkylineElement",
      elementImport: "@abhiramkrishna/contribution-skyline/element",
      container: "el",
      dataArgument: { js: "data", vue: ":data=\"data\"", react: "data={data}", element: "src=\"/contributions.json\"" },
    },
    async create(stage, values) {
      const { options, theme } = splitTheme(values);
      const skyline = new ContributionSkyline(stage, data, { ...options, theme, grid: { compactBreakpoint: 0 } });
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
}

const KINDS: Record<string, () => Promise<Kind>> = { grid: gridKind, skyline: skylineKind };

function storedFramework(): Framework {
  try {
    const label = localStorage.getItem(SYNC_KEY);
    const match = (Object.keys(FRAMEWORK_LABELS) as Framework[]).find((key) => FRAMEWORK_LABELS[key] === label);
    return match ?? "js";
  } catch {
    return "js";
  }
}

function storeFramework(framework: Framework): void {
  try {
    localStorage.setItem(SYNC_KEY, FRAMEWORK_LABELS[framework]);
  } catch {
    return;
  }
}

async function mount(root: HTMLElement): Promise<void> {
  const kind = await KINDS[root.dataset.playground ?? ""]?.();
  if (!kind) return;
  const stage = root.querySelector<HTMLElement>("[data-stage]")!;
  const panelHost = root.querySelector<HTMLElement>("[data-panel]")!;
  const code = root.querySelector<HTMLElement>("[data-code]")!;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>("[data-framework]")];
  const copy = root.querySelector<HTMLButtonElement>("[data-copy]")!;
  const reset = root.querySelector<HTMLButtonElement>("[data-reset]")!;

  const defaults = (): Values => Object.fromEntries(kind.controls.map((entry) => [entry.key, entry.default]));
  const values = defaults();
  let framework = storedFramework();
  let instance = await kind.create(stage, values);

  const render = (): void => {
    code.textContent = snippet(framework, kind.spec, kind.controls, values);
    for (const tab of tabs) tab.setAttribute("aria-selected", String(tab.dataset.framework === framework));
  };

  const rebuild = async (): Promise<void> => {
    instance.destroy();
    instance = await kind.create(stage, values);
  };

  const panel = createPanel(panelHost, kind.controls, values, (entry) => {
    if (entry.live) instance.apply(entry, values);
    else void rebuild();
    render();
  });

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      framework = tab.dataset.framework as Framework;
      storeFramework(framework);
      render();
    });
  }

  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent ?? "");
      copy.textContent = "Copied";
    } catch {
      copy.textContent = "Copy failed";
    }
    setTimeout(() => { copy.textContent = "Copy"; }, 1500);
  });

  reset.addEventListener("click", async () => {
    Object.assign(values, defaults());
    panel.refresh();
    await rebuild();
    render();
  });

  root.dataset.ready = "true";
  render();
}

export function initPlaygrounds(): void {
  const roots = document.querySelectorAll<HTMLElement>("[data-playground]:not([data-ready])");
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      void mount(entry.target as HTMLElement);
    }
  }, { rootMargin: "200px" });
  roots.forEach((root) => observer.observe(root));
}
