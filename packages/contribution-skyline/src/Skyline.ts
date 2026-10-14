import { SpacetimeGrid, type SpacetimeGridOptions, type SpacetimeGridTheme } from "@abhiramkrishna/spacetime-grid";
import { DAYS_PER_WEEK } from "./constants";
import type { ContributionData } from "./data";
import { SkylineLayer } from "./SkylineLayer";

export interface ContributionSkylineOptions {
  progress?: number | (() => number);
  theme?: Partial<SpacetimeGridTheme>;
  floor?: boolean;
  grid?: SpacetimeGridOptions;
}

const FLOOR_MARGIN_COLS = 4;
const FLOOR_MARGIN_ROWS = 4;
const CAMERA_ELEVATION = 0.5;
const LOOK_LIFT = 0.35;
const FIT_PADDING = 1.08;
const BAR_ROOM = 1.3;
const FLOOR_OPACITY = 0.55;

export class ContributionSkyline {
  readonly grid: SpacetimeGrid;
  readonly layer: SkylineLayer;

  private readonly container: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly position: [number, number, number] = [0, 0, 0];
  private readonly lookAt: [number, number, number] = [0, 0, 0];
  private destroyed = false;

  constructor(container: HTMLElement, data: ContributionData, options: ContributionSkylineOptions = {}) {
    this.container = container;
    const weeks = Math.max(1, Math.ceil(data.days.length / DAYS_PER_WEEK));
    this.grid = new SpacetimeGrid(container, {
      waveAmplitude: 0,
      sway: 0,
      compactBreakpoint: 0,
      tileOpacity: options.floor === false ? 0 : FLOOR_OPACITY,
      ...options.grid,
      cols: options.grid?.cols ?? weeks + FLOOR_MARGIN_COLS,
      rows: options.grid?.rows ?? DAYS_PER_WEEK + FLOOR_MARGIN_ROWS,
      theme: { ...options.grid?.theme, ...options.theme },
    });
    this.layer = new SkylineLayer(data, { progress: options.progress ?? 1 });
    this.grid.use(this.layer);
    this.frame();
    this.resizeObserver = new ResizeObserver(() => this.frame());
    this.resizeObserver.observe(container);
  }

  setProgress(progress: number | (() => number)): void {
    this.layer.setProgress(progress);
  }

  setData(data: ContributionData): void {
    this.layer.setData(data);
  }

  setTheme(theme: Partial<SpacetimeGridTheme>): void {
    this.grid.setTheme(theme);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizeObserver.disconnect();
    this.grid.destroy();
  }

  private frame(): void {
    if (this.destroyed) return;
    const { grid } = this;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const vHalf = (grid.camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const floorWidth = grid.cols * grid.cellSize;
    const floorDepth = grid.rows * grid.cellSize;
    const fitWidth = ((floorWidth / 2) * FIT_PADDING) / Math.tan(hHalf);
    const fitHeight = (((floorDepth * Math.sin(CAMERA_ELEVATION) + BAR_ROOM) / 2) * FIT_PADDING) / Math.tan(vHalf);
    const distance = Math.max(fitWidth, fitHeight);

    const center = grid.group.position;
    this.lookAt[0] = center.x;
    this.lookAt[1] = center.y + LOOK_LIFT;
    this.lookAt[2] = center.z;
    this.position[0] = center.x;
    this.position[1] = this.lookAt[1] + Math.sin(CAMERA_ELEVATION) * distance;
    this.position[2] = center.z + Math.cos(CAMERA_ELEVATION) * distance;
    grid.setCameraTarget({ position: this.position, lookAt: this.lookAt }, { immediate: true });
    grid.setOptions({ fogNear: distance * 0.9, fogFar: distance + floorDepth * 2 + 4 });
  }
}
