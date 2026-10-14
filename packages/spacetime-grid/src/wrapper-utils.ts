import { DEFAULT_SETTINGS, DEFAULT_THEME, type SpacetimeGridLiveOptions, type SpacetimeGridOptions, type SpacetimeGridSettings, type StructuralSetting } from "./options";
import type { SpacetimeGridTheme } from "./types";

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SpacetimeGridSettings)[];
export const STRUCTURAL_KEYS: readonly StructuralSetting[] = ["cols", "rows", "cellSize", "fill"];
export const LIVE_KEYS = SETTING_KEYS.filter((key) => !(STRUCTURAL_KEYS as readonly string[]).includes(key)) as Exclude<keyof SpacetimeGridSettings, StructuralSetting>[];
export const THEME_KEYS = Object.keys(DEFAULT_THEME) as (keyof SpacetimeGridTheme)[];

type Loose = Record<string, unknown>;

function coerce(key: keyof SpacetimeGridSettings, value: unknown): unknown {
  const fallback = DEFAULT_SETTINGS[key];
  if (typeof fallback === "boolean") return value === "" || value === "true" ? true : value === "false" ? false : Boolean(value);
  if (typeof fallback === "number") {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return value;
}

export function pickOptions(source: Loose): SpacetimeGridOptions {
  const options: Loose = {};
  for (const key of SETTING_KEYS) {
    if (source[key] !== undefined && source[key] !== null) options[key] = coerce(key, source[key]);
  }
  const theme = source.theme as Partial<SpacetimeGridTheme> | undefined;
  if (theme) options.theme = { ...theme };
  return options as SpacetimeGridOptions;
}

export function liveOptions(source: Loose): SpacetimeGridLiveOptions {
  const picked = pickOptions(source) as Loose;
  const options: Loose = {};
  for (const key of LIVE_KEYS) options[key] = picked[key] ?? DEFAULT_SETTINGS[key];
  options.theme = { ...DEFAULT_THEME, ...(picked.theme as Partial<SpacetimeGridTheme> | undefined) };
  return options as SpacetimeGridLiveOptions;
}

export function structuralSignature(source: Loose): string {
  const picked = pickOptions(source) as Loose;
  return STRUCTURAL_KEYS.map((key) => String(picked[key] ?? DEFAULT_SETTINGS[key])).join("|");
}

function colorKey(value: unknown): string {
  if (value && typeof value === "object" && "getHexString" in value) return (value as { getHexString(): string }).getHexString();
  return String(value);
}

export function liveSignature(source: Loose): string {
  const live = liveOptions(source) as Loose;
  const theme = live.theme as Loose;
  return [...LIVE_KEYS.map((key) => String(live[key])), ...THEME_KEYS.map((key) => colorKey(theme[key]))].join("|");
}

export function toKebab(key: string): string {
  return key.replace(/\./g, "-").replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
