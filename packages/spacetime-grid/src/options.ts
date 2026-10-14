import type { SpacetimeGridTheme } from "./types";

export type ReducedMotionMode = "auto" | "always" | "never";

export interface SpacetimeGridSettings {
  cols: number;
  rows: number;
  cellSize: number;
  fill: number;
  waveAmplitude: number;
  waveSpeed: number;
  sway: number;
  cursorWell: boolean;
  wellRadius: number;
  wellDepth: number;
  wellEase: number;
  ripples: boolean;
  rippleSpeed: number;
  rippleWidth: number;
  rippleHeight: number;
  rippleLifetime: number;
  fogNear: number;
  fogFar: number;
  tileOpacity: number;
  fov: number;
  cameraEase: number;
  maxPixelRatio: number;
  compactBreakpoint: number;
  reducedMotion: ReducedMotionMode;
}

export type StructuralSetting = "cols" | "rows" | "cellSize" | "fill";

export interface SpacetimeGridOptions extends Partial<SpacetimeGridSettings> {
  theme?: Partial<SpacetimeGridTheme>;
}

export interface SpacetimeGridLiveOptions extends Partial<Omit<SpacetimeGridSettings, StructuralSetting>> {
  theme?: Partial<SpacetimeGridTheme>;
}

export const DEFAULT_THEME: SpacetimeGridTheme = {
  base: "#0c1f33",
  hover: "#43d9ad",
  fog: "#011627",
  fresnel: "#bfe9ff",
};

export const DEFAULT_SETTINGS: SpacetimeGridSettings = {
  cols: 64,
  rows: 60,
  cellSize: 0.34,
  fill: 0.72,
  waveAmplitude: 0.09,
  waveSpeed: 1,
  sway: 0.03,
  cursorWell: true,
  wellRadius: 2.2,
  wellDepth: 0.55,
  wellEase: 0.1,
  ripples: true,
  rippleSpeed: 2.4,
  rippleWidth: 0.55,
  rippleHeight: 0.55,
  rippleLifetime: 2.4,
  fogNear: 5,
  fogFar: 12,
  tileOpacity: 0.55,
  fov: 50,
  cameraEase: 0.06,
  maxPixelRatio: 2,
  compactBreakpoint: 1024,
  reducedMotion: "auto",
};

interface SchemaBase {
  key: string;
  label: string;
  group: string;
  description: string;
  live: boolean;
}

export interface NumberOptionSchema extends SchemaBase {
  type: "number";
  default: number;
  min: number;
  max: number;
  step: number;
}

export interface BooleanOptionSchema extends SchemaBase {
  type: "boolean";
  default: boolean;
}

export interface ColorOptionSchema extends SchemaBase {
  type: "color";
  default: string;
}

export interface SelectOptionSchema extends SchemaBase {
  type: "select";
  default: string;
  choices: readonly string[];
}

export type OptionSchema = NumberOptionSchema | BooleanOptionSchema | ColorOptionSchema | SelectOptionSchema;

const d = DEFAULT_SETTINGS;

function num(key: keyof SpacetimeGridSettings, label: string, group: string, min: number, max: number, step: number, description: string, live = true): NumberOptionSchema {
  return { key, label, group, type: "number", default: d[key] as number, min, max, step, description, live };
}

function bool(key: keyof SpacetimeGridSettings, label: string, group: string, description: string): BooleanOptionSchema {
  return { key, label, group, type: "boolean", default: d[key] as boolean, description, live: true };
}

function color(key: keyof SpacetimeGridTheme, label: string, description: string): ColorOptionSchema {
  return { key: `theme.${key}`, label, group: "Colours", type: "color", default: DEFAULT_THEME[key] as string, description, live: true };
}

export const SPACETIME_GRID_SCHEMA: readonly OptionSchema[] = [
  num("cols", "Columns", "Grid", 8, 160, 1, "Number of tile columns.", false),
  num("rows", "Rows", "Grid", 8, 160, 1, "Number of tile rows.", false),
  num("cellSize", "Cell size", "Grid", 0.1, 1, 0.01, "Distance between tile centres, in world units.", false),
  num("fill", "Tile fill", "Grid", 0.1, 1, 0.01, "How much of each cell a tile covers (1 = no gap).", false),
  num("tileOpacity", "Tile opacity", "Grid", 0, 1, 0.01, "Opacity of every tile."),
  num("waveAmplitude", "Amplitude", "Waves", 0, 0.4, 0.005, "Height of the idle waves."),
  num("waveSpeed", "Speed", "Waves", 0, 4, 0.05, "Speed multiplier for the idle waves."),
  num("sway", "Sway", "Waves", 0, 0.2, 0.005, "How far the whole grid rocks from side to side, in radians."),
  bool("cursorWell", "Cursor well", "Gravity well", "Sink the tiles under the mouse cursor."),
  num("wellRadius", "Radius", "Gravity well", 0.2, 6, 0.1, "Radius of the cursor well, in world units."),
  num("wellDepth", "Depth", "Gravity well", 0, 2, 0.05, "How deep the cursor well sinks the tiles."),
  num("wellEase", "Ease", "Gravity well", 0.01, 1, 0.01, "How quickly tiles follow the well each frame (1 = instantly)."),
  bool("ripples", "Click ripples", "Ripples", "Send an energy ring across the grid on click or tap."),
  num("rippleSpeed", "Speed", "Ripples", 0.2, 8, 0.1, "How fast a ripple ring spreads, in world units per second."),
  num("rippleWidth", "Width", "Ripples", 0.05, 2, 0.05, "Thickness of the ripple ring."),
  num("rippleHeight", "Height", "Ripples", 0, 2, 0.05, "How high the ripple ring lifts the tiles."),
  num("rippleLifetime", "Lifetime", "Ripples", 0.2, 8, 0.1, "Seconds before a ripple fades out."),
  color("base", "Base", "Resting tile colour."),
  color("hover", "Highlight", "Colour of tiles in a well, ripple or data glow."),
  color("fog", "Fog", "Fog colour; match it to the page background."),
  color("fresnel", "Rim", "Fresnel rim colour on tiles seen at a grazing angle."),
  num("fogNear", "Fog start", "Fog", 0, 30, 0.5, "Distance where the fog begins."),
  num("fogFar", "Fog end", "Fog", 1, 60, 0.5, "Distance where tiles fully fade into the fog."),
  num("fov", "Field of view", "Camera", 20, 100, 1, "Vertical field of view, in degrees."),
  num("cameraEase", "Camera ease", "Camera", 0.01, 1, 0.01, "How quickly the camera moves toward its target each frame."),
  num("maxPixelRatio", "Max pixel ratio", "Rendering", 0.5, 3, 0.25, "Upper limit on the device pixel ratio; lower is faster."),
  num("compactBreakpoint", "Compact below", "Rendering", 0, 2000, 10, "Below this canvas width (px) the grid drops lower and shrinks, for phones."),
  {
    key: "reducedMotion",
    label: "Reduced motion",
    group: "Rendering",
    type: "select",
    default: d.reducedMotion,
    choices: ["auto", "always", "never"],
    description: "auto follows prefers-reduced-motion; always renders a still frame; never always animates.",
    live: true,
  },
];

export function resolveSettings(options: SpacetimeGridOptions): SpacetimeGridSettings {
  const settings: SpacetimeGridSettings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SpacetimeGridSettings)[]) {
    const value = options[key];
    if (value !== undefined) (settings as unknown as Record<string, unknown>)[key] = value;
  }
  settings.cols = Math.max(1, Math.round(settings.cols));
  settings.rows = Math.max(1, Math.round(settings.rows));
  return settings;
}
