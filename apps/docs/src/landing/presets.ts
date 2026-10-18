import { SPACETIME_GRID_SCHEMA } from "@abhiramkrishna/spacetime-grid";
import { defaultValues, type ControlSchema, type Values } from "@/registry";
import { pick } from "@/registry/demo";
import { spacetimeGrid } from "@/registry/spacetime-grid";

export interface HeroPreset {
  id: string;
  label: string;
  values: Values;
}

export const HERO_CONTROLS: readonly ControlSchema[] = pick(SPACETIME_GRID_SCHEMA as readonly ControlSchema[], [
  "waveAmplitude", "waveSpeed", "wellRadius", "wellDepth", "rippleSpeed", "rippleLifetime", "theme.hover",
]);

const base = defaultValues(HERO_CONTROLS);

const heroKeys = new Set(HERO_CONTROLS.map((entry) => entry.key));

export const HERO_PRESETS: readonly HeroPreset[] = [
  { id: "default", label: "Default", values: base },
  ...(spacetimeGrid.presets ?? [])
    .filter((preset) => Object.keys(preset.values).every((key) => heroKeys.has(key)))
    .map((preset) => ({ ...preset, values: { ...base, ...preset.values } })),
];
