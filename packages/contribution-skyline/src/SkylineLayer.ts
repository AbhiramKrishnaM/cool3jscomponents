import {
  BoxGeometry,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
  type Color,
} from "three";
import type { CameraPose, GridFrame, GridPlugin, SpacetimeGrid } from "@abhiramkrishna/spacetime-grid";
import {
  BAR_HEIGHT,
  BAR_OPACITY,
  BAR_STAGGER,
  BURST_EVERY,
  BURST_FLASH,
  BURST_LEVEL,
  DAYS_PER_WEEK,
  LEVEL_GLOW,
  SHARD_LIFE,
  SHARD_POOL,
  SHARD_SIZE,
  SPARK_GRAVITY,
  SPARK_POOL,
  SPARK_SHARDS,
  SPARK_SIZE,
  TWINKLE_PERIOD,
  VISIBLE_THRESHOLD,
} from "./constants";
import type { ContributionData } from "./data";
import { createParticlePool, disposePool, emit, stepPool, type ParticlePool } from "./particles";
import { barFrag, barVert } from "./shaders";

export interface SkylineAnchor {
  ndc: readonly [number, number];
  pose?: CameraPose;
}

export interface SkylineLayerOptions {
  progress?: number | (() => number);
  origin?: { col: number; row: number };
  anchor?: SkylineAnchor;
}

interface Bars {
  mesh: InstancedMesh<BoxGeometry, ShaderMaterial>;
  cell: Int32Array;
  level: Uint8Array;
  week: Uint16Array;
  twinkleIndex: Int32Array;
  nextBurst: Float32Array;
  flashAt: Float32Array;
  count: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export class SkylineLayer implements GridPlugin {
  private grid: SpacetimeGrid | null = null;
  private data: ContributionData;
  private progressSource: number | (() => number);
  private readonly origin: { col: number; row: number } | undefined;
  private readonly anchor: SkylineAnchor | undefined;

  private weeks = 0;
  private cells: Int32Array = new Int32Array(0);
  private cellGlow: Float32Array = new Float32Array(0);
  private cellPeriod: Float32Array = new Float32Array(0);
  private cellOffset: Float32Array = new Float32Array(0);
  private bars: Bars | null = null;
  private sparks: ParticlePool | null = null;
  private shards: ParticlePool | null = null;
  private strength = 0;
  private hover: Color | null = null;

  constructor(data: ContributionData, options: SkylineLayerOptions = {}) {
    this.data = data;
    this.progressSource = options.progress ?? 1;
    this.origin = options.origin;
    this.anchor = options.anchor;
  }

  setProgress(progress: number | (() => number)): void {
    this.progressSource = progress;
    this.grid?.invalidate();
  }

  setData(data: ContributionData): void {
    this.data = data;
    if (!this.grid) return;
    const grid = this.grid;
    this.teardown();
    this.build(grid);
    grid.invalidate();
  }

  setup(grid: SpacetimeGrid): () => void {
    this.build(grid);
    return () => this.teardown();
  }

  themeChanged(colors: { hover: Color }): void {
    this.hover = colors.hover;
  }

  beforeFrame(frame: GridFrame): void {
    const grid = this.grid;
    if (!grid) return;
    const source = this.progressSource;
    this.strength = clamp(typeof source === "function" ? source() : source, 0, 1);
    const { cells, cellGlow } = this;
    const glow = grid.glow;
    const strength = this.strength;
    for (let k = 0; k < cells.length; k++) {
      const cell = cells[k];
      glow[cell] = strength > 0 ? cellGlow[k] * strength * this.twinkle(k, frame) : 0;
    }
  }

  afterFrame(frame: GridFrame): void {
    if (!this.grid) return;
    this.updateBars(frame);
    this.updateParticles(frame);
  }

  private build(grid: SpacetimeGrid): void {
    this.grid = grid;
    this.hover = grid.colors.hover;
    const days = this.data.days;
    this.weeks = Math.ceil(days.length / DAYS_PER_WEEK);
    const { col0, row0 } = this.placement(grid);

    const cells: number[] = [];
    const glow: number[] = [];
    const period: number[] = [];
    const offset: number[] = [];
    const barCells: number[] = [];
    const barLevels: number[] = [];
    const barWeeks: number[] = [];
    const barTwinkle: number[] = [];

    for (let i = 0; i < days.length; i++) {
      const col = col0 + Math.floor(i / DAYS_PER_WEEK);
      const row = row0 + DAYS_PER_WEEK - 1 - (i % DAYS_PER_WEEK);
      if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) continue;
      const index = row * grid.cols + col;
      const level = days[i].level;
      cells.push(index);
      glow.push(LEVEL_GLOW[level] ?? 0);
      period.push(TWINKLE_PERIOD[0] + Math.random() * (TWINKLE_PERIOD[1] - TWINKLE_PERIOD[0]));
      offset.push(Math.random() * TWINKLE_PERIOD[1]);
      if (level > 0) {
        barCells.push(index);
        barLevels.push(level);
        barWeeks.push(Math.floor(i / DAYS_PER_WEEK));
        barTwinkle.push(cells.length - 1);
      }
    }

    this.cells = Int32Array.from(cells);
    this.cellGlow = Float32Array.from(glow);
    this.cellPeriod = Float32Array.from(period);
    this.cellOffset = Float32Array.from(offset);
    this.bars = this.buildBars(grid, barCells, barLevels, barWeeks, barTwinkle);
    this.sparks = createParticlePool(SPARK_POOL, SPARK_SIZE);
    this.shards = createParticlePool(SHARD_POOL, SHARD_SIZE);
    grid.group.add(this.bars.mesh, this.sparks.points, this.shards.points);
  }

  private placement(grid: SpacetimeGrid): { col0: number; row0: number } {
    if (this.origin) return { col0: this.origin.col, row0: this.origin.row };
    const half = Math.floor(this.weeks / 2);
    let centerCol = Math.floor(grid.cols / 2);
    let centerRow = Math.floor(grid.rows / 2);
    if (this.anchor) {
      const hit = grid.screenToGround(this.anchor.ndc[0], this.anchor.ndc[1], { pose: this.anchor.pose, out: new Vector3() });
      if (hit) {
        centerCol = Math.round((hit.x + (grid.cols * grid.cellSize) / 2) / grid.cellSize);
        centerRow = Math.round((hit.y + (grid.rows * grid.cellSize) / 2) / grid.cellSize);
      }
    }
    return {
      col0: clamp(centerCol - half, 0, Math.max(0, grid.cols - this.weeks)),
      row0: clamp(centerRow - 3, 0, Math.max(0, grid.rows - DAYS_PER_WEEK)),
    };
  }

  private buildBars(grid: SpacetimeGrid, cells: number[], levels: number[], weeks: number[], twinkle: number[]): Bars {
    const size = grid.cellSize * grid.settings.fill;
    const geometry = new BoxGeometry(size, size, 1);
    geometry.translate(0, 0, 0.5);
    const material = new ShaderMaterial({
      vertexShader: barVert,
      fragmentShader: barFrag,
      uniforms: { ...UniformsUtils.clone(UniformsLib.fog), uOpacity: { value: BAR_OPACITY } },
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    const count = cells.length;
    const mesh = new InstancedMesh(geometry, material, Math.max(1, count));
    mesh.count = count;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(Math.max(1, count) * 3), 3);
    mesh.instanceColor.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.visible = false;
    return {
      mesh,
      cell: Int32Array.from(cells),
      level: Uint8Array.from(levels),
      week: Uint16Array.from(weeks),
      twinkleIndex: Int32Array.from(twinkle),
      nextBurst: new Float32Array(count).fill(-1),
      flashAt: new Float32Array(count).fill(-1),
      count,
    };
  }

  private twinkle(k: number, frame: GridFrame): number {
    if (!frame.motion) return 1;
    const phase = ((frame.t + this.cellOffset[k]) / this.cellPeriod[k]) % 1;
    if (phase < 0.92) return 1;
    return 1 - 0.8 * (1 - Math.abs(phase - 0.96) / 0.04);
  }

  private updateBars(frame: GridFrame): void {
    const bars = this.bars;
    const grid = this.grid;
    const hover = this.hover;
    if (!bars || !grid || !hover) return;
    const strength = this.strength;
    bars.mesh.visible = strength > VISIBLE_THRESHOLD && bars.count > 0;
    if (!bars.mesh.visible) return;

    const { centers, heights } = grid;
    const matrices = bars.mesh.instanceMatrix.array as Float32Array;
    const colors = (bars.mesh.instanceColor as InstancedBufferAttribute).array as Float32Array;
    const t = frame.t;

    for (let i = 0; i < bars.count; i++) {
      const cell = bars.cell[i];
      const level = bars.level[i];
      const rise = clamp(strength * (1 + BAR_STAGGER) - (bars.week[i] / this.weeks) * BAR_STAGGER, 0, 1);
      const eased = rise * rise * (3 - 2 * rise);
      const h = Math.max(0.001, BAR_HEIGHT[level] * eased);
      const x = centers[cell * 2];
      const y = centers[cell * 2 + 1];
      const z = heights[cell];

      const m = i * 16;
      matrices[m] = 1;
      matrices[m + 5] = 1;
      matrices[m + 10] = h;
      matrices[m + 12] = x;
      matrices[m + 13] = y;
      matrices[m + 14] = z;

      let flash = 0;
      if (level === BURST_LEVEL && frame.motion && eased > 0.98) {
        if (bars.nextBurst[i] < 0) bars.nextBurst[i] = t + Math.random() * BURST_EVERY[0];
        if (t >= bars.nextBurst[i]) {
          this.burst(x, y, z + h);
          bars.flashAt[i] = t;
          bars.nextBurst[i] = t + BURST_EVERY[0] + Math.random() * (BURST_EVERY[1] - BURST_EVERY[0]);
        }
        if (bars.flashAt[i] >= 0) flash = Math.max(0, 1 - (t - bars.flashAt[i]) / BURST_FLASH);
      }

      const tint = (0.55 + 0.45 * (level / 4)) * this.twinkle(bars.twinkleIndex[i], frame) + flash * 2.2;
      const c = i * 3;
      colors[c] = hover.r * tint;
      colors[c + 1] = hover.g * tint;
      colors[c + 2] = hover.b * tint;
    }

    bars.mesh.instanceMatrix.needsUpdate = true;
    (bars.mesh.instanceColor as InstancedBufferAttribute).needsUpdate = true;
  }

  private burst(x: number, y: number, z: number): void {
    const sparks = this.sparks;
    if (!sparks) return;
    const count = 18 + Math.floor(Math.random() * 8);
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.1;
      emit(sparks, x, y, z, Math.cos(a) * speed, Math.sin(a) * speed, 1.2 + Math.random() * 1.3, 9);
    }
  }

  private readonly shatter = (x: number, y: number): void => {
    const shards = this.shards;
    if (!shards) return;
    for (let k = 0; k < SPARK_SHARDS; k++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.35 + Math.random() * 0.6;
      const life = SHARD_LIFE[0] + Math.random() * (SHARD_LIFE[1] - SHARD_LIFE[0]);
      emit(shards, x, y, 0.02, Math.cos(a) * speed, Math.sin(a) * speed, 0.3 + Math.random() * 0.5, life);
    }
  };

  private updateParticles(frame: GridFrame): void {
    const { sparks, shards, hover } = this;
    if (!sparks || !shards || !hover) return;
    const visible = this.strength > VISIBLE_THRESHOLD;
    sparks.points.visible = visible;
    shards.points.visible = visible;
    if (!visible) return;
    stepPool(sparks, frame.dt, SPARK_GRAVITY, hover, this.shatter);
    stepPool(shards, frame.dt, SPARK_GRAVITY * 0.8, hover, null);
  }

  private teardown(): void {
    const grid = this.grid;
    if (grid) for (let k = 0; k < this.cells.length; k++) grid.glow[this.cells[k]] = 0;
    if (this.bars) {
      this.bars.mesh.removeFromParent();
      this.bars.mesh.geometry.dispose();
      this.bars.mesh.material.dispose();
      this.bars.mesh.dispose();
    }
    if (this.sparks) disposePool(this.sparks);
    if (this.shards) disposePool(this.shards);
    this.bars = null;
    this.sparks = null;
    this.shards = null;
    this.cells = new Int32Array(0);
    this.grid = null;
  }
}

export function contributionSkyline(data: ContributionData, options: SkylineLayerOptions = {}): SkylineLayer {
  return new SkylineLayer(data, options);
}
