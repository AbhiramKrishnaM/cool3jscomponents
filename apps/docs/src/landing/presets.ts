import { SPACETIME_GRID_SCHEMA } from "@abhiramkrishna/spacetime-grid";
import { defaultValues, type ControlSchema, type Values } from "@/registry";
import { pick } from "@/registry/demo";

export interface HeroPreset {
  id: string;
  label: string;
  values: Values;
}

export const HERO_CONTROLS: readonly ControlSchema[] = pick(SPACETIME_GRID_SCHEMA as readonly ControlSchema[], [
  "waveAmplitude", "waveSpeed", "wellRadius", "wellDepth", "rippleSpeed", "rippleLifetime", "theme.hover",
]);

const base = defaultValues(HERO_CONTROLS);

export const HERO_PRESETS: readonly HeroPreset[] = [
  { id: "default", label: "Default", values: base },
  { id: "calm", label: "Calm", values: { ...base, waveAmplitude: 0.04, waveSpeed: 0.5, wellDepth: 0.3 } },
  { id: "storm", label: "Storm", values: { ...base, waveAmplitude: 0.2, waveSpeed: 1.8, rippleSpeed: 3.6, rippleLifetime: 3.2 } },
  { id: "deep-well", label: "Deep well", values: { ...base, wellRadius: 3.4, wellDepth: 1.2 } },
  { id: "ember", label: "Ember", values: { ...base, waveAmplitude: 0.12, rippleSpeed: 1.6, "theme.hover": "#fea55f" } },
];
