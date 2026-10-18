import { changedValues } from "@/registry/snippet";
import { defaultValues, type ControlSchema, type Preset, type Values } from "@/registry";

const HEX = /^#?([0-9a-f]{6})$/i;
const RANDOM_REACH = 0.6;

function decimals(step: number | undefined): number {
  if (!step || step >= 1) return 0;
  return Math.min(4, Math.ceil(-Math.log10(step)));
}

function snap(value: number, entry: ControlSchema): number {
  const min = entry.min ?? 0;
  const max = entry.max ?? 1;
  const step = entry.step ?? 0;
  const snapped = step ? min + Math.round((value - min) / step) * step : value;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals(step)));
}

function parse(entry: ControlSchema, raw: string): unknown {
  if (entry.type === "number") {
    const value = Number(raw);
    return raw.trim() !== "" && Number.isFinite(value) ? snap(value, entry) : undefined;
  }
  if (entry.type === "boolean") return raw === "true" ? true : raw === "false" ? false : undefined;
  if (entry.type === "color") {
    const match = HEX.exec(raw);
    return match ? `#${match[1]!.toLowerCase()}` : undefined;
  }
  return entry.choices?.includes(raw) ? raw : undefined;
}

export function valuesFromSearch(controls: readonly ControlSchema[], search: string): Values {
  const params = new URLSearchParams(search);
  const values = defaultValues(controls);
  for (const entry of controls) {
    const raw = params.get(entry.key);
    if (raw === null) continue;
    const value = parse(entry, raw);
    if (value !== undefined) values[entry.key] = value;
  }
  return values;
}

export function searchFromValues(controls: readonly ControlSchema[], values: Values): string {
  const { options, theme } = changedValues(controls, values);
  const params = new URLSearchParams();
  for (const [entry, value] of options) {
    params.set(entry.key, entry.type === "number" ? String(snap(value as number, entry)) : String(value).replace(/^#/, ""));
  }
  for (const [key, value] of theme) params.set(`theme.${key}`, String(value).replace(/^#/, ""));
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function presetValues(controls: readonly ControlSchema[], preset: Preset): Values {
  return { ...defaultValues(controls), ...preset.values };
}

function same(entry: ControlSchema, a: unknown, b: unknown): boolean {
  return entry.type === "number" ? Math.abs((a as number) - (b as number)) < 1e-9 : a === b;
}

function equal(controls: readonly ControlSchema[], a: Values, b: Values): boolean {
  return controls.every((entry) => same(entry, a[entry.key], b[entry.key]));
}

export function matchingPreset(controls: readonly ControlSchema[], presets: readonly Preset[], values: Values): string | undefined {
  if (equal(controls, values, defaultValues(controls))) return "default";
  return presets.find((preset) => equal(controls, values, presetValues(controls, preset)))?.id;
}

function hexToHsl(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255;
  const g = (n >> 8 & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const channel = (n: number): string => {
    const k = (n + h / 30) % 12;
    const value = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function randomColor(base: string): string {
  if (!HEX.test(base)) return base;
  const [, s, l] = hexToHsl(base.startsWith("#") ? base : `#${base}`);
  return hslToHex(Math.random() * 360, Math.max(s, 0.55), l);
}

export function randomValues(controls: readonly ControlSchema[]): Values {
  const values = defaultValues(controls);
  for (const entry of controls) {
    if (entry.type === "number") {
      const base = entry.default as number;
      const low = base - RANDOM_REACH * (base - (entry.min ?? base));
      const high = base + RANDOM_REACH * ((entry.max ?? base) - base);
      values[entry.key] = snap(low + Math.random() * (high - low), entry);
    } else if (entry.type === "boolean") {
      values[entry.key] = Math.random() < 0.75 ? entry.default : !entry.default;
    } else if (entry.type === "color") {
      values[entry.key] = randomColor(entry.default as string);
    } else {
      const choices = entry.choices ?? [];
      values[entry.key] = choices[Math.floor(Math.random() * choices.length)] ?? entry.default;
    }
  }
  return values;
}
