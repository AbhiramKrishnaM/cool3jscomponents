import { DEFAULT_SKYLINE_SETTINGS, DEFAULT_STANDALONE_SETTINGS, type SkylineSettings, type StandaloneSettings } from "./options";
import type { ContributionSkylineLiveOptions } from "./Skyline";

type AllSettings = SkylineSettings & StandaloneSettings;
type Loose = Record<string, unknown>;

const DEFAULTS: AllSettings = { ...DEFAULT_SKYLINE_SETTINGS, ...DEFAULT_STANDALONE_SETTINGS };
export const SKYLINE_KEYS = (Object.keys(DEFAULTS) as (keyof AllSettings)[]).filter((key) => key !== "progress");

function coerce(key: keyof AllSettings, value: unknown): unknown {
  const fallback = DEFAULTS[key];
  if (typeof fallback === "boolean") return value === "" || value === "true" ? true : value === "false" ? false : Boolean(value);
  if (typeof fallback === "number") {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return value;
}

export function pickSkylineOptions(source: Loose): ContributionSkylineLiveOptions {
  const options: Loose = {};
  for (const key of SKYLINE_KEYS) {
    if (source[key] !== undefined && source[key] !== null) options[key] = coerce(key, source[key]);
  }
  if (source.theme) options.theme = { ...(source.theme as Loose) };
  return options as ContributionSkylineLiveOptions;
}

export function liveSkylineOptions(source: Loose): ContributionSkylineLiveOptions {
  const picked = pickSkylineOptions(source) as Loose;
  const options: Loose = {};
  for (const key of SKYLINE_KEYS) options[key] = picked[key] ?? DEFAULTS[key];
  if (picked.theme) options.theme = picked.theme;
  return options as ContributionSkylineLiveOptions;
}

export function liveSkylineSignature(source: Loose): string {
  const live = liveSkylineOptions(source) as Loose;
  const theme = live.theme ? JSON.stringify(live.theme) : "";
  return [...SKYLINE_KEYS.map((key) => String(live[key])), theme].join("|");
}

export function progressValue(progress: unknown): number | (() => number) {
  if (typeof progress === "function") return progress as () => number;
  const n = Number(progress);
  return progress === undefined || progress === null || !Number.isFinite(n) ? DEFAULT_SKYLINE_SETTINGS.progress : n;
}

export function toKebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
