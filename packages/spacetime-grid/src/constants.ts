export const COLS = 64;
export const ROWS = 60;
export const CELL = 0.34;
export const FILL = 0.72;

export const WELL_RADIUS = 2.2;
export const WELL_DEPTH = 0.55;
export const WELL_EASE = 0.1;
export const CAMERA_EASE = 0.06;

export const WAVE_AMPLITUDE = 0.09;
export const WAVE_OCTAVES = 6;

export const MAX_RIPPLES = 6;
export const RIPPLE_SPEED = 2.4;
export const RIPPLE_WIDTH = 0.55;
export const RIPPLE_HEIGHT = 0.55;
export const RIPPLE_LIFETIME = 2.4;

export const FOG_NEAR = 5;
export const FOG_FAR = 12;
export const TILE_OPACITY = 0.55;
export const MAX_PIXEL_RATIO = 2;

export const CAMERA_POSE = { pos: [0, 1.3, 6], look: [0, -1, -3] } as const;

export const COMPACT_BREAKPOINT = 1024;
export const LAYOUT = {
  wide: { y: -1.3, z: -1.2, scale: 1 },
  compact: { y: -1.6, z: -1.6, scale: 0.85 },
} as const;
