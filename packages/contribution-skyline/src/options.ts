import type { ReducedMotionMode } from "@abhiramkrishna/spacetime-grid";

export interface SkylineSettings {
  progress: number;
  barScale: number;
  barOpacity: number;
  stagger: number;
  glowStrength: number;
  color: string;
  twinkle: boolean;
  twinkleDepth: number;
  bursts: boolean;
  burstLevel: number;
  burstMinInterval: number;
  burstMaxInterval: number;
  sparkSize: number;
  shardSize: number;
  reducedMotionProgress: number;
}

export interface StandaloneSettings {
  floor: boolean;
  cameraElevation: number;
  reducedMotion: ReducedMotionMode;
}

export const DEFAULT_SKYLINE_SETTINGS: SkylineSettings = {
  progress: 1,
  barScale: 1,
  barOpacity: 0.85,
  stagger: 0.55,
  glowStrength: 1,
  color: "",
  twinkle: true,
  twinkleDepth: 0.8,
  bursts: true,
  burstLevel: 4,
  burstMinInterval: 3.5,
  burstMaxInterval: 8,
  sparkSize: 5,
  shardSize: 2.6,
  reducedMotionProgress: 1,
};

export const DEFAULT_STANDALONE_SETTINGS: StandaloneSettings = {
  floor: true,
  cameraElevation: 0.5,
  reducedMotion: "auto",
};

interface SchemaBase {
  key: string;
  label: string;
  group: string;
  description: string;
  live: true;
  standaloneOnly?: true;
}

export type SkylineOptionSchema =
  | (SchemaBase & { type: "number"; default: number; min: number; max: number; step: number })
  | (SchemaBase & { type: "boolean"; default: boolean })
  | (SchemaBase & { type: "color"; default: string })
  | (SchemaBase & { type: "select"; default: string; choices: readonly string[] });

const s = DEFAULT_SKYLINE_SETTINGS;
const a = DEFAULT_STANDALONE_SETTINGS;

function num(key: keyof SkylineSettings, label: string, group: string, min: number, max: number, step: number, description: string): SkylineOptionSchema {
  return { key, label, group, type: "number", default: s[key] as number, min, max, step, description, live: true };
}

function bool(key: keyof SkylineSettings, label: string, group: string, description: string): SkylineOptionSchema {
  return { key, label, group, type: "boolean", default: s[key] as boolean, description, live: true };
}

export const CONTRIBUTION_SKYLINE_SCHEMA: readonly SkylineOptionSchema[] = [
  num("progress", "Progress", "Bars", 0, 1, 0.01, "How far the bars have risen (0 = flat, 1 = full). Pass a function in code to drive it from scroll."),
  num("barScale", "Height scale", "Bars", 0, 3, 0.05, "Multiplier for bar heights."),
  num("barOpacity", "Opacity", "Bars", 0, 1, 0.01, "Opacity of the bars."),
  num("stagger", "Week stagger", "Bars", 0, 2, 0.05, "How much later each week rises than the one before (0 = all at once)."),
  num("glowStrength", "Tile glow", "Bars", 0, 2, 0.05, "How strongly active days light up the grid tiles underneath."),
  { key: "color", label: "Bar colour", group: "Colours", type: "color", default: s.color, description: "Bar and particle colour. Leave empty to follow the grid's highlight colour.", live: true },
  bool("twinkle", "Twinkle", "Twinkle", "Each bar dims briefly on its own 13–21 s cycle."),
  num("twinkleDepth", "Depth", "Twinkle", 0, 1, 0.05, "How far a bar dims during a twinkle."),
  bool("bursts", "Bursts", "Bursts", "The busiest days flash and burst into falling pixels."),
  num("burstLevel", "Burst level", "Bursts", 1, 4, 1, "Minimum contribution level (1–4) that bursts."),
  num("burstMinInterval", "Min interval", "Bursts", 0.5, 30, 0.5, "Shortest gap between bursts from one bar, in seconds."),
  num("burstMaxInterval", "Max interval", "Bursts", 0.5, 30, 0.5, "Longest gap between bursts from one bar, in seconds."),
  num("sparkSize", "Spark size", "Bursts", 1, 12, 0.5, "Size of the rising sparks, in CSS pixels."),
  num("shardSize", "Shard size", "Bursts", 0.5, 8, 0.1, "Size of the shards that scatter on landing, in CSS pixels."),
  num("reducedMotionProgress", "Still progress", "Motion", 0, 1, 0.01, "Progress shown when motion is reduced, instead of the animated value."),
  { key: "floor", label: "Floor", group: "Scene", type: "boolean", default: a.floor, description: "Show the tile floor under the bars.", live: true, standaloneOnly: true },
  { key: "cameraElevation", label: "Camera angle", group: "Scene", type: "number", default: a.cameraElevation, min: 0.1, max: 1.4, step: 0.05, description: "How steeply the camera looks down, in radians.", live: true, standaloneOnly: true },
  { key: "reducedMotion", label: "Reduced motion", group: "Motion", type: "select", default: a.reducedMotion, choices: ["auto", "always", "never"], description: "auto follows prefers-reduced-motion; always renders a still frame; never always animates.", live: true, standaloneOnly: true },
];

export function mergeSettings<T extends object>(target: T, source: Partial<T>): T {
  for (const key of Object.keys(source) as (keyof T)[]) {
    const value = source[key];
    if (value !== undefined && key in target) target[key] = value as T[keyof T];
  }
  return target;
}
