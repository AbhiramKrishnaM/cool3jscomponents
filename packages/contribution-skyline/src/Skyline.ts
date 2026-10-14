import { SpacetimeGrid, type SpacetimeGridOptions, type SpacetimeGridTheme } from "@abhiramkrishna/spacetime-grid";
import { DAYS_PER_WEEK } from "./constants";
import type { ContributionData } from "./data";
import { DEFAULT_STANDALONE_SETTINGS, mergeSettings, type SkylineSettings, type StandaloneSettings } from "./options";
import { SkylineLayer, type SkylineLiveOptions } from "./SkylineLayer";

export type ContributionSkylineLiveOptions = SkylineLiveOptions & Partial<StandaloneSettings> & {
  theme?: Partial<SpacetimeGridTheme>;
};

export type ContributionSkylineOptions = ContributionSkylineLiveOptions & {
  grid?: SpacetimeGridOptions;
};

const FLOOR_MARGIN_COLS = 4;
const FLOOR_MARGIN_ROWS = 4;
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
  private readonly scene: StandaloneSettings;
  private destroyed = false;

  constructor(container: HTMLElement, data: ContributionData, options: ContributionSkylineOptions = {}) {
    const { grid: gridOptions, theme, floor, cameraElevation, reducedMotion, ...layerOptions } = options;
    this.container = container;
    this.scene = mergeSettings({ ...DEFAULT_STANDALONE_SETTINGS }, { floor, cameraElevation, reducedMotion });
    const weeks = Math.max(1, Math.ceil(data.days.length / DAYS_PER_WEEK));
    this.grid = new SpacetimeGrid(container, {
      waveAmplitude: 0,
      sway: 0,
      compactBreakpoint: 0,
      tileOpacity: this.scene.floor ? FLOOR_OPACITY : 0,
      reducedMotion: this.scene.reducedMotion,
      ...gridOptions,
      cols: gridOptions?.cols ?? weeks + FLOOR_MARGIN_COLS,
      rows: gridOptions?.rows ?? DAYS_PER_WEEK + FLOOR_MARGIN_ROWS,
      theme: { ...gridOptions?.theme, ...theme },
    });
    this.layer = new SkylineLayer(data, layerOptions);
    this.grid.use(this.layer);
    this.frame();
    this.resizeObserver = new ResizeObserver(() => this.frame());
    this.resizeObserver.observe(container);
  }

  get settings(): Readonly<SkylineSettings & StandaloneSettings> {
    return { ...this.layer.settings, ...this.scene };
  }

  setOptions(options: ContributionSkylineLiveOptions): void {
    const { theme, floor, cameraElevation, reducedMotion, ...layerOptions } = options;
    mergeSettings(this.scene, { floor, cameraElevation, reducedMotion });
    this.grid.setOptions({ tileOpacity: this.scene.floor ? FLOOR_OPACITY : 0, reducedMotion: this.scene.reducedMotion });
    if (theme) this.grid.setTheme(theme);
    this.layer.setOptions(layerOptions);
    this.frame();
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
    const fitHeight = (((floorDepth * Math.sin(this.scene.cameraElevation) + BAR_ROOM) / 2) * FIT_PADDING) / Math.tan(vHalf);
    const distance = Math.max(fitWidth, fitHeight);

    const center = grid.group.position;
    this.lookAt[0] = center.x;
    this.lookAt[1] = center.y + LOOK_LIFT;
    this.lookAt[2] = center.z;
    this.position[0] = center.x;
    this.position[1] = this.lookAt[1] + Math.sin(this.scene.cameraElevation) * distance;
    this.position[2] = center.z + Math.cos(this.scene.cameraElevation) * distance;
    grid.setCameraTarget({ position: this.position, lookAt: this.lookAt }, { immediate: true });
    grid.setOptions({ fogNear: distance * 0.9, fogFar: distance + floorDepth * 2 + 4 });
  }
}
