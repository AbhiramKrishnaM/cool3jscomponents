import {
  Color,
  DynamicDrawUsage,
  Fog,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  CAMERA_POSE,
  GLOW_BRIGHTEN,
  GLOW_LIFT,
  GROUND_TILT,
  LAYOUT,
  MAX_EXTRA_WELLS,
  MAX_FRAME_DT,
  MAX_RIPPLES,
  SWAY_SPEED,
} from "./constants";
import {
  DEFAULT_THEME,
  resolveSettings,
  type SpacetimeGridLiveOptions,
  type SpacetimeGridOptions,
  type SpacetimeGridSettings,
} from "./options";
import { gridFrag, gridVert } from "./shaders";
import type {
  CameraPose,
  GridColors,
  GridFrame,
  GridPlugin,
  SpacetimeGridTheme,
  WellOptions,
} from "./types";
import { createWaveField, prepareWaveFrame, waveHeightAt, type WaveField } from "./waves";

export const DEFAULT_CAMERA_POSE: CameraPose = {
  position: CAMERA_POSE.pos,
  lookAt: CAMERA_POSE.look,
};

interface GridUniforms {
  [name: string]: { value: unknown };
  uFresnelColor: { value: Color };
  uOpacity: { value: number };
}

interface PluginEntry {
  plugin: GridPlugin;
  teardown: (() => void) | null;
}

const MAX_WELLS = MAX_EXTRA_WELLS + 1;

export class SpacetimeGrid {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly group: Group;
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly centers: Float32Array;
  readonly heights: Float32Array;
  readonly glow: Float32Array;
  readonly colors: GridColors;

  private readonly mesh: InstancedMesh<PlaneGeometry, ShaderMaterial>;
  private readonly uniforms: GridUniforms;
  private readonly fog: Fog;
  private readonly theme: SpacetimeGridTheme;
  private readonly opts: SpacetimeGridSettings;
  private readonly motionQuery: MediaQueryList;
  private motion = false;
  private waveTime = 0;
  private readonly baseColor = new Color();
  private readonly hoverColor = new Color();
  private readonly well: Float32Array;
  private readonly waves: WaveField;
  private readonly plugins: PluginEntry[] = [];
  private readonly frame: GridFrame = { t: 0, dt: 0, motion: false };
  private lastT = 0;

  private readonly rippleX = new Float32Array(MAX_RIPPLES);
  private readonly rippleY = new Float32Array(MAX_RIPPLES);
  private readonly rippleStart = new Float32Array(MAX_RIPPLES);
  private readonly rippleStrength = new Float32Array(MAX_RIPPLES);
  private rippleCount = 0;

  private readonly wellClientX = new Float32Array(MAX_EXTRA_WELLS);
  private readonly wellClientY = new Float32Array(MAX_EXTRA_WELLS);
  private readonly wellRadius = new Float32Array(MAX_EXTRA_WELLS);
  private readonly wellDepth = new Float32Array(MAX_EXTRA_WELLS);
  private extraWellCount = 0;
  private readonly activeX = new Float32Array(MAX_WELLS);
  private readonly activeY = new Float32Array(MAX_WELLS);
  private readonly activeRadiusSq = new Float32Array(MAX_WELLS);
  private readonly activeDepth = new Float32Array(MAX_WELLS);

  private readonly raycaster = new Raycaster();
  private readonly groundPlane = new Plane();
  private readonly planeNormal = new Vector3();
  private readonly groundPoint = new Vector3();
  private readonly ndc = new Vector2();
  private readonly cameraPos = new Vector3();
  private readonly cameraLook = new Vector3();
  private readonly targetPos = new Vector3();
  private readonly targetLook = new Vector3();
  private readonly savedPos = new Vector3();
  private readonly savedQuat = new Quaternion();

  private readonly ownsCanvas: boolean;
  private readonly sizeTarget: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly visibilityObserver: IntersectionObserver;
  private readonly finePointer: boolean;
  private readonly count: number;
  private pointerActive = false;
  private pointerX = 0;
  private pointerY = 0;
  private frameId = 0;
  private running = false;
  private onScreen = true;
  private startTime = 0;
  private pausedAt = 0;
  private currentT = 0;
  private destroyed = false;

  constructor(target: HTMLElement, options: SpacetimeGridOptions = {}) {
    this.theme = { ...DEFAULT_THEME, ...options.theme };
    this.opts = resolveSettings(options);
    this.cols = this.opts.cols;
    this.rows = this.opts.rows;
    this.cellSize = this.opts.cellSize;
    this.count = this.cols * this.rows;
    this.colors = { base: this.baseColor, hover: this.hoverColor };
    this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.motion = this.computeMotion();
    this.finePointer = window.matchMedia("(pointer: fine)").matches;

    if (target instanceof HTMLCanvasElement) {
      this.canvas = target;
      this.ownsCanvas = false;
      this.sizeTarget = target;
    } else {
      this.canvas = document.createElement("canvas");
      this.canvas.style.display = "block";
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
      target.appendChild(this.canvas);
      this.ownsCanvas = true;
      this.sizeTarget = target;
    }

    const { width, height } = this.measure();
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.opts.maxPixelRatio));
    this.renderer.setSize(width, height, false);

    this.scene = new Scene();
    this.fog = new Fog(this.theme.fog, this.opts.fogNear, this.opts.fogFar);
    this.scene.fog = this.fog;

    this.camera = new PerspectiveCamera(this.opts.fov, width / height, 0.1, 100);
    this.setCameraTarget(DEFAULT_CAMERA_POSE, { immediate: true });

    this.group = new Group();
    this.group.rotation.x = GROUND_TILT;
    this.scene.add(this.group);

    const count = this.count;
    this.centers = new Float32Array(count * 2);
    this.heights = new Float32Array(count);
    this.glow = new Float32Array(count);
    this.well = new Float32Array(count);
    this.fillCenters();
    this.waves = createWaveField(this.centers, count);

    this.uniforms = {
      ...UniformsUtils.clone(UniformsLib.fog),
      uFresnelColor: { value: new Color() },
      uOpacity: { value: this.opts.tileOpacity },
    };
    this.mesh = this.buildMesh(count);
    this.group.add(this.mesh);

    this.applyTheme();
    this.applyLayout(width);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.sizeTarget);
    window.addEventListener("mousemove", this.onMouseMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", this.onMouseLeave);
    window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    document.addEventListener("visibilitychange", this.updateRunning);
    this.motionQuery.addEventListener("change", this.onMotionPreference);
    this.visibilityObserver = new IntersectionObserver(this.onIntersect);
    this.visibilityObserver.observe(this.canvas);

    this.startTime = performance.now();
    this.pausedAt = this.startTime;
    if (this.motion) this.updateRunning();
    else this.renderStill();
  }

  get isRunning(): boolean {
    return this.running;
  }

  get motionAllowed(): boolean {
    return this.motion;
  }

  get settings(): Readonly<SpacetimeGridSettings> {
    return this.opts;
  }

  setOptions(options: SpacetimeGridLiveOptions): void {
    const { theme, ...rest } = options;
    for (const key of Object.keys(rest) as (keyof typeof rest)[]) {
      const value = rest[key];
      if (value !== undefined && key in this.opts) (this.opts as unknown as Record<string, unknown>)[key] = value;
    }
    this.fog.near = this.opts.fogNear;
    this.fog.far = this.opts.fogFar;
    this.uniforms.uOpacity.value = this.opts.tileOpacity;
    if (this.camera.fov !== this.opts.fov) {
      this.camera.fov = this.opts.fov;
      this.camera.updateProjectionMatrix();
    }
    if (!this.opts.cursorWell) this.pointerActive = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.opts.maxPixelRatio));
    this.resize();
    if (theme) this.setTheme(theme);
    this.syncMotion();
    this.renderStill();
  }

  use(plugin: GridPlugin): () => void {
    const entry: PluginEntry = { plugin, teardown: null };
    this.plugins.push(entry);
    entry.teardown = plugin.setup?.(this) ?? null;
    plugin.themeChanged?.(this.colors);
    this.renderStill();
    return () => this.removePlugin(entry);
  }

  setTheme(theme: Partial<SpacetimeGridTheme>): void {
    Object.assign(this.theme, theme);
    this.applyTheme();
    for (let i = 0; i < this.plugins.length; i++) this.plugins[i].plugin.themeChanged?.(this.colors);
    this.renderStill();
  }

  setCameraTarget(pose: CameraPose, options: { immediate?: boolean } = {}): void {
    this.targetPos.fromArray(pose.position);
    this.targetLook.fromArray(pose.lookAt);
    if (options.immediate) this.snapCamera();
  }

  addWell(clientX: number, clientY: number, options: WellOptions = {}): void {
    if (!this.motion || this.extraWellCount >= MAX_EXTRA_WELLS) return;
    const strength = options.strength ?? 1;
    if (strength <= 0) return;
    const i = this.extraWellCount++;
    this.wellClientX[i] = clientX;
    this.wellClientY[i] = clientY;
    this.wellRadius[i] = options.radius ?? this.opts.wellRadius;
    this.wellDepth[i] = (options.depth ?? this.opts.wellDepth) * strength;
  }

  ripple(clientX: number, clientY: number, strength = 1): void {
    if (!this.motion) return;
    if (!this.clientToNdc(clientX, clientY)) return;
    this.updateGroundPlane();
    if (this.groundPointAt(this.ndc.x, this.ndc.y, this.groundPoint)) {
      this.spawnRipple(this.groundPoint.x, this.groundPoint.y, strength);
    }
  }

  screenToGround(ndcX: number, ndcY: number, options: { pose?: CameraPose; out?: Vector3 } = {}): Vector3 | null {
    const out = options.out ?? new Vector3();
    const { pose } = options;
    if (pose) {
      this.savedPos.copy(this.camera.position);
      this.savedQuat.copy(this.camera.quaternion);
      this.camera.position.fromArray(pose.position);
      this.camera.lookAt(this.groundPoint.fromArray(pose.lookAt));
    }
    this.camera.updateMatrixWorld();
    this.group.updateMatrixWorld();
    this.updateGroundPlane();
    const hit = this.groundPointAt(ndcX, ndcY, out);
    if (pose) {
      this.camera.position.copy(this.savedPos);
      this.camera.quaternion.copy(this.savedQuat);
      this.camera.updateMatrixWorld();
    }
    return hit ? out : null;
  }

  resize(): void {
    if (this.destroyed) return;
    const { width, height } = this.measure();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.applyLayout(width);
    this.renderStill();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    while (this.plugins.length) {
      const entry = this.plugins[this.plugins.length - 1];
      this.removePlugin(entry);
    }
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    document.removeEventListener("visibilitychange", this.updateRunning);
    this.motionQuery.removeEventListener("change", this.onMotionPreference);
    window.removeEventListener("mousemove", this.onMouseMove);
    document.documentElement.removeEventListener("mouseleave", this.onMouseLeave);
    window.removeEventListener("pointerdown", this.onPointerDown);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
    this.renderer.dispose();
    if (this.ownsCanvas) this.canvas.remove();
  }

  private removePlugin(entry: PluginEntry): void {
    const index = this.plugins.indexOf(entry);
    if (index === -1) return;
    this.plugins.splice(index, 1);
    entry.teardown?.();
    this.renderStill();
  }

  private renderStill(): void {
    if (!this.motion && !this.destroyed) this.renderFrame(0);
  }

  private computeMotion(): boolean {
    const mode = this.opts.reducedMotion;
    if (mode === "always") return false;
    if (mode === "never") return true;
    return !this.motionQuery.matches;
  }

  private readonly onMotionPreference = (): void => {
    this.syncMotion();
  };

  private syncMotion(): void {
    const motion = this.computeMotion();
    if (motion === this.motion) return;
    this.motion = motion;
    if (!motion) {
      this.pointerActive = false;
      this.rippleCount = 0;
      this.extraWellCount = 0;
      this.well.fill(0);
    }
    this.updateRunning();
    this.renderStill();
  }

  private snapCamera(): void {
    this.cameraPos.copy(this.targetPos);
    this.cameraLook.copy(this.targetLook);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.cameraLook);
  }

  private measure(): { width: number; height: number } {
    return {
      width: Math.max(1, this.sizeTarget.clientWidth),
      height: Math.max(1, this.sizeTarget.clientHeight),
    };
  }

  private fillCenters(): void {
    const { cols, rows, cellSize } = this;
    const w = cols * cellSize;
    const h = rows * cellSize;
    let i = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.centers[i * 2] = col * cellSize - w / 2 + cellSize / 2;
        this.centers[i * 2 + 1] = row * cellSize - h / 2 + cellSize / 2;
        i++;
      }
    }
  }

  private buildMesh(count: number): InstancedMesh<PlaneGeometry, ShaderMaterial> {
    const tile = this.cellSize * this.opts.fill;
    const geometry = new PlaneGeometry(tile, tile);
    const material = new ShaderMaterial({
      vertexShader: gridVert,
      fragmentShader: gridFrag,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    const mesh = new InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(count * 3), 3);
    mesh.instanceColor.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    return mesh;
  }

  private applyTheme(): void {
    this.baseColor.set(this.theme.base);
    this.hoverColor.set(this.theme.hover);
    this.fog.color.set(this.theme.fog);
    this.uniforms.uFresnelColor.value.set(this.theme.fresnel);
  }

  private applyLayout(width: number): void {
    const layout = width < this.opts.compactBreakpoint ? LAYOUT.compact : LAYOUT.wide;
    this.group.position.set(0, layout.y, layout.z);
    this.group.scale.setScalar(layout.scale);
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (!this.finePointer || !this.motion || !this.opts.cursorWell) return;
    this.pointerActive = true;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
  };

  private readonly onMouseLeave = (): void => {
    this.pointerActive = false;
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (this.opts.ripples) this.ripple(e.clientX, e.clientY, 1);
  };

  private clientToNdc(clientX: number, clientY: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    if (x < -1 || x > 1 || y < -1 || y > 1) return false;
    this.ndc.set(x, y);
    return true;
  }

  private updateGroundPlane(): void {
    this.planeNormal.set(0, 0, 1).applyQuaternion(this.group.quaternion);
    this.groundPlane.setFromNormalAndCoplanarPoint(this.planeNormal, this.group.position);
  }

  private groundPointAt(ndcX: number, ndcY: number, out: Vector3): boolean {
    this.ndc.set(ndcX, ndcY);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, out)) return false;
    this.group.worldToLocal(out);
    return true;
  }

  private resolveWells(): number {
    let count = 0;
    if (this.pointerActive) count = this.resolveWell(count, this.pointerX, this.pointerY, this.opts.wellRadius, this.opts.wellDepth);
    for (let i = 0; i < this.extraWellCount; i++) {
      count = this.resolveWell(count, this.wellClientX[i], this.wellClientY[i], this.wellRadius[i], this.wellDepth[i]);
    }
    this.extraWellCount = 0;
    return count;
  }

  private resolveWell(count: number, clientX: number, clientY: number, radius: number, depth: number): number {
    if (!this.clientToNdc(clientX, clientY)) return count;
    if (!this.groundPointAt(this.ndc.x, this.ndc.y, this.groundPoint)) return count;
    this.activeX[count] = this.groundPoint.x;
    this.activeY[count] = this.groundPoint.y;
    this.activeRadiusSq[count] = radius * radius;
    this.activeDepth[count] = depth;
    return count + 1;
  }

  private spawnRipple(x: number, y: number, strength: number): void {
    if (this.rippleCount >= MAX_RIPPLES) this.dropOldestRipples(1);
    const i = this.rippleCount++;
    this.rippleX[i] = x;
    this.rippleY[i] = y;
    this.rippleStart[i] = this.currentT;
    this.rippleStrength[i] = strength;
  }

  private dropOldestRipples(n: number): void {
    for (let i = n; i < this.rippleCount; i++) {
      this.rippleX[i - n] = this.rippleX[i];
      this.rippleY[i - n] = this.rippleY[i];
      this.rippleStart[i - n] = this.rippleStart[i];
      this.rippleStrength[i - n] = this.rippleStrength[i];
    }
    this.rippleCount -= n;
  }

  private expireRipples(t: number): void {
    let expired = 0;
    const lifetime = this.opts.rippleLifetime;
    while (expired < this.rippleCount && t - this.rippleStart[expired] >= lifetime) expired++;
    if (expired) this.dropOldestRipples(expired);
  }

  private readonly onIntersect = (entries: IntersectionObserverEntry[]): void => {
    const entry = entries[entries.length - 1];
    if (!entry) return;
    this.onScreen = entry.isIntersecting;
    this.updateRunning();
  };

  private readonly updateRunning = (): void => {
    const shouldRun = this.motion && !this.destroyed && this.onScreen && !document.hidden;
    if (shouldRun) this.start();
    else this.stop();
  };

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime += performance.now() - this.pausedAt;
    this.tick();
  }

  private stop(): void {
    if (!this.running) return;
    this.running = false;
    this.pausedAt = performance.now();
    cancelAnimationFrame(this.frameId);
  }

  private readonly tick = (): void => {
    this.frameId = requestAnimationFrame(this.tick);
    this.renderFrame((performance.now() - this.startTime) / 1000);
  };

  private renderFrame(t: number): void {
    const { frame, plugins, opts } = this;
    const elapsed = Math.max(0, t - this.lastT);
    this.currentT = t;
    frame.t = t;
    frame.dt = Math.min(MAX_FRAME_DT, elapsed);
    frame.motion = this.motion;
    this.lastT = t;
    if (this.motion) this.waveTime += elapsed * opts.waveSpeed;

    this.group.rotation.z = this.motion ? Math.sin(t * SWAY_SPEED) * opts.sway : 0;

    for (let p = 0; p < plugins.length; p++) plugins[p].plugin.beforeFrame?.(frame);

    if (this.motion) {
      this.cameraPos.lerp(this.targetPos, opts.cameraEase);
      this.cameraLook.lerp(this.targetLook, opts.cameraEase);
      this.camera.position.copy(this.cameraPos);
      this.camera.lookAt(this.cameraLook);
    } else {
      this.snapCamera();
    }

    this.updateGroundPlane();
    const wellCount = this.resolveWells();
    this.expireRipples(t);
    prepareWaveFrame(this.waves, this.waveTime);

    const { centers, heights, glow, well, baseColor, hoverColor } = this;
    const { activeX, activeY, activeRadiusSq, activeDepth } = this;
    const matrices = this.mesh.instanceMatrix.array as Float32Array;
    const colors = (this.mesh.instanceColor as InstancedBufferAttribute).array as Float32Array;
    const rippleCount = this.rippleCount;
    const count = this.count;
    const waveScale = opts.waveAmplitude / this.waves.weightSum;
    const wellEase = opts.wellEase;
    const litDepth = opts.wellDepth > 0 ? opts.wellDepth : 1;
    const rippleSpeed = opts.rippleSpeed;
    const rippleWidth = opts.rippleWidth;
    const rippleHeight = opts.rippleHeight;
    const rippleLifetime = opts.rippleLifetime;

    for (let i = 0; i < count; i++) {
      const cx = centers[i * 2];
      const cy = centers[i * 2 + 1];

      let target = 0;
      for (let w = 0; w < wellCount; w++) {
        const dx = cx - activeX[w];
        const dy = cy - activeY[w];
        const distSq = dx * dx + dy * dy;
        if (distSq < activeRadiusSq[w]) {
          const k = 1 - distSq / activeRadiusSq[w];
          target += k * k * activeDepth[w];
        }
      }

      well[i] += (target - well[i]) * wellEase;
      const lit = Math.min(1, well[i] / litDepth);
      const wave = waveHeightAt(this.waves, i, waveScale);

      let ring = 0;
      for (let r = 0; r < rippleCount; r++) {
        const age = t - this.rippleStart[r];
        const dx = cx - this.rippleX[r];
        const dy = cy - this.rippleY[r];
        const distToRing = Math.abs(Math.sqrt(dx * dx + dy * dy) - age * rippleSpeed);
        const front = Math.max(0, 1 - distToRing / rippleWidth);
        const decay = Math.max(0, 1 - age / rippleLifetime);
        ring += front * front * decay * this.rippleStrength[r];
      }

      const g = glow[i];
      const z = wave - well[i] + ring * rippleHeight + g * GLOW_LIFT;
      heights[i] = z;
      const m = i * 16;
      matrices[m + 12] = cx;
      matrices[m + 13] = cy;
      matrices[m + 14] = z;

      const mix = g > lit ? g : lit;
      const shade = 1 + wave * 0.9 + g * GLOW_BRIGHTEN;
      const c = i * 3;
      colors[c] = Math.min(1, (baseColor.r + (hoverColor.r - baseColor.r) * mix) * shade + hoverColor.r * ring);
      colors[c + 1] = Math.min(1, (baseColor.g + (hoverColor.g - baseColor.g) * mix) * shade + hoverColor.g * ring);
      colors[c + 2] = Math.min(1, (baseColor.b + (hoverColor.b - baseColor.b) * mix) * shade + hoverColor.b * ring);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    (this.mesh.instanceColor as InstancedBufferAttribute).needsUpdate = true;

    for (let p = 0; p < plugins.length; p++) plugins[p].plugin.afterFrame?.(frame);

    this.renderer.render(this.scene, this.camera);
  }
}
