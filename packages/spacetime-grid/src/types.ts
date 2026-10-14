import type { Color, ColorRepresentation } from "three";
import type { SpacetimeGrid } from "./SpacetimeGrid";

export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  position: Vec3;
  lookAt: Vec3;
}

export interface SpacetimeGridTheme {
  base: ColorRepresentation;
  hover: ColorRepresentation;
  fog: ColorRepresentation;
  fresnel: ColorRepresentation;
}

export interface GridFrame {
  t: number;
  dt: number;
  motion: boolean;
}

export interface GridColors {
  readonly base: Color;
  readonly hover: Color;
}

export interface WellOptions {
  radius?: number;
  depth?: number;
  strength?: number;
}

export interface GridPlugin {
  setup?(grid: SpacetimeGrid): void | (() => void);
  beforeFrame?(frame: GridFrame): void;
  afterFrame?(frame: GridFrame): void;
  themeChanged?(colors: GridColors): void;
}
