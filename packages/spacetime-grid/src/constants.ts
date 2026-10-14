export const WAVE_OCTAVES = 6;
export const MAX_RIPPLES = 6;
export const MAX_EXTRA_WELLS = 4;
export const GLOW_LIFT = 0.06;
export const GLOW_BRIGHTEN = 0.5;
export const MAX_FRAME_DT = 0.05;
export const SWAY_SPEED = 0.12;
export const GROUND_TILT = -Math.PI * 0.42;

export const CAMERA_POSE = { pos: [0, 1.3, 6], look: [0, -1, -3] } as const;

export const LAYOUT = {
  wide: { y: -1.3, z: -1.2, scale: 1 },
  compact: { y: -1.6, z: -1.6, scale: 0.85 },
} as const;
