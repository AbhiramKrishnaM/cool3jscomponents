import { splitTheme } from "@/registry/demo";
import type { Values } from "@/registry";
import { copyText } from "@/lib/copy";

export async function initHero(root: HTMLElement): Promise<void> {
  const stage = root.querySelector<HTMLElement>("[data-hero-stage]")!;
  const presets = JSON.parse(root.dataset.presets ?? "[]") as { id: string; values: Values }[];
  const chips = [...root.querySelectorAll<HTMLButtonElement>("[data-preset]")];
  const blocks = [...root.querySelectorAll<HTMLElement>("[data-preset-code]")];
  const copy = root.querySelector<HTMLButtonElement>("[data-hero-copy]")!;
  let active = presets[0]?.id ?? "";

  const { SpacetimeGrid } = await import("@abhiramkrishna/spacetime-grid");
  const initial = splitTheme(presets[0]?.values ?? {});
  const grid = new SpacetimeGrid(stage, { ...initial.options, theme: initial.theme });
  stage.dataset.ready = "";

  const select = (id: string): void => {
    const preset = presets.find((candidate) => candidate.id === id);
    if (!preset) return;
    active = id;
    const { options, theme } = splitTheme(preset.values);
    grid.setOptions({ ...options, theme });
    for (const chip of chips) chip.setAttribute("aria-pressed", String(chip.dataset.preset === id));
    for (const block of blocks) block.hidden = block.dataset.presetCode !== id;
  };

  for (const chip of chips) chip.addEventListener("click", () => select(chip.dataset.preset ?? ""));
  copy.addEventListener("click", () => {
    const block = blocks.find((candidate) => candidate.dataset.presetCode === active);
    void copyText(copy, block?.dataset.source ?? "");
  });
}
