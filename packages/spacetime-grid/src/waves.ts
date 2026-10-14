import { WAVE_OCTAVES } from "./constants";

export interface WaveField {
  speed: Float32Array;
  sinT: Float32Array;
  cosT: Float32Array;
  cellSin: Float32Array;
  cellCos: Float32Array;
  weightSum: number;
}

export function createWaveField(centers: Float32Array, count: number): WaveField {
  const dx = new Float32Array(WAVE_OCTAVES);
  const dy = new Float32Array(WAVE_OCTAVES);
  const freq = new Float32Array(WAVE_OCTAVES);
  const speed = new Float32Array(WAVE_OCTAVES);
  const phase = new Float32Array(WAVE_OCTAVES);
  const weight = new Float32Array(WAVE_OCTAVES);
  let weightSum = 0;
  for (let o = 0; o < WAVE_OCTAVES; o++) {
    const angle = Math.random() * Math.PI * 2;
    dx[o] = Math.cos(angle);
    dy[o] = Math.sin(angle);
    freq[o] = 0.18 + Math.random() * 0.55;
    speed[o] = 0.12 + Math.random() * 0.45;
    phase[o] = Math.random() * Math.PI * 2;
    weight[o] = 0.5 + Math.random() * 0.5;
    weightSum += weight[o];
  }

  const cellSin = new Float32Array(count * WAVE_OCTAVES);
  const cellCos = new Float32Array(count * WAVE_OCTAVES);
  for (let i = 0; i < count; i++) {
    const x = centers[i * 2];
    const y = centers[i * 2 + 1];
    for (let o = 0; o < WAVE_OCTAVES; o++) {
      const a = (x * dx[o] + y * dy[o]) * freq[o] + phase[o];
      cellSin[i * WAVE_OCTAVES + o] = Math.sin(a) * weight[o];
      cellCos[i * WAVE_OCTAVES + o] = Math.cos(a) * weight[o];
    }
  }

  return {
    speed,
    sinT: new Float32Array(WAVE_OCTAVES),
    cosT: new Float32Array(WAVE_OCTAVES),
    cellSin,
    cellCos,
    weightSum,
  };
}

export function prepareWaveFrame(field: WaveField, t: number): void {
  for (let o = 0; o < WAVE_OCTAVES; o++) {
    field.sinT[o] = Math.sin(t * field.speed[o]);
    field.cosT[o] = Math.cos(t * field.speed[o]);
  }
}

export function waveHeightAt(field: WaveField, i: number, scale: number): number {
  const base = i * WAVE_OCTAVES;
  let h = 0;
  for (let o = 0; o < WAVE_OCTAVES; o++) {
    h += field.cellSin[base + o] * field.cosT[o] + field.cellCos[base + o] * field.sinT[o];
  }
  return h * scale;
}
