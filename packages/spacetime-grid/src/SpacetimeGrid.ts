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
  CAMERA_EASE,
  CAMERA_POSE,
  CELL,
  COLS,
  COMPACT_BREAKPOINT,
  FILL,
  FOG_FAR,
  FOG_NEAR,
  GLOW_BRIGHTEN,
  GLOW_LIFT,
  LAYOUT,
  MAX_EXTRA_WELLS,
  MAX_FRAME_DT,
  MAX_PIXEL_RATIO,
  MAX_RIPPLES,
  RIPPLE_HEIGHT,
  RIPPLE_LIFETIME,
  RIPPLE_SPEED,
  RIPPLE_WIDTH,
  ROWS,
  TILE_OPACITY,
  WELL_DEPTH,
  WELL_EASE,
  WELL_RADIUS,
} from "./constants";
import { gridFrag, gridVert } from "./shaders";
import type {
  CameraPose,
  GridColors,
  GridFrame,
  GridPlugin,
  SpacetimeGridOptions,
  SpacetimeGridTheme,
  WellOptions,
} from "./types";
import { createWaveField, prepareWaveFrame, waveHeightAt, type WaveField } from "./waves";

export const DEFAULT_THEME: SpacetimeGridTheme = {
  base: "#0c1f33",
  hover: "#43d9ad",
  fog: "#011627",
  fresnel: "#bfe9ff",
};

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
  readonly cols = COLS;
  readonly rows = ROWS;
  readonly cellSize = CELL;
  readonly centers: Float32Array;
  readonly heights: Float32Array;
  readonly glow: Float32Array;
  readonly colors: GridColors;
  readonly motionAllowed: boolean;

  private readonly mesh: InstancedMesh<PlaneGeometry, ShaderMaterial>;
  private readonly uniforms: GridUniforms;
  private readonly fog: Fog;
  private readonly theme: SpacetimeGridTheme;
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
    this.colors = { base: this.baseColor, hover: this.hoverColor };
    this.motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(width, height, false);

    this.scene = new Scene();
    this.fog = new Fog(this.theme.fog, FOG_NEAR, FOG_FAR);
    this.scene.fog = this.fog;

    this.camera = new PerspectiveCamera(50, width / height, 0.1, 100);
    this.setCameraTarget(DEFAULT_CAMERA_POSE, { immediate: true });

    this.group = new Group();
    this.group.rotation.x = -Math.PI * 0.42;
    this.scene.add(this.group);

    const count = COLS * ROWS;
    this.centers = new Float32Array(count * 2);
    this.heights = new Float32Array(count);
    this.glow = new Float32Array(count);
    this.well = new Float32Array(count);
    this.fillCenters();
    this.waves = createWaveField(this.centers, count);

    this.uniforms = {
      ...UniformsUtils.clone(UniformsLib.fog),
      uFresnelColor: { value: new Color() },
      uOpacity: { value: TILE_OPACITY },
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
    this.visibilityObserver = new IntersectionObserver(this.onIntersect);
    this.visibilityObserver.observe(this.canvas);

    this.startTime = performance.now();
    this.pausedAt = this.startTime;
    if (this.motionAllowed) this.updateRunning();
    else this.renderStill();
  }

  get isRunning(): boolean {
    return this.running;
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
    if (!this.motionAllowed || this.extraWellCount >= MAX_EXTRA_WELLS) return;
    const strength = options.strength ?? 1;
    if (strength <= 0) return;
    const i = this.extraWellCount++;
    this.wellClientX[i] = clientX;
    this.wellClientY[i] = clientY;
    this.wellRadius[i] = options.radius ?? WELL_RADIUS;
    this.wellDepth[i] = (options.depth ?? WELL_DEPTH) * strength;
  }

  ripple(clientX: number, clientY: number, strength = 1): void {
    if (!this.motionAllowed) return;
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
    if (!this.motionAllowed && !this.destroyed) this.renderFrame(0);
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
    const w = COLS * CELL;
    const h = ROWS * CELL;
    let i = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.centers[i * 2] = col * CELL - w / 2 + CELL / 2;
        this.centers[i * 2 + 1] = row * CELL - h / 2 + CELL / 2;
        i++;
      }
    }
  }

  private buildMesh(count: number): InstancedMesh<PlaneGeometry, ShaderMaterial> {
    const geometry = new PlaneGeometry(CELL * FILL, CELL * FILL);
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
    const layout = width < COMPACT_BREAKPOINT ? LAYOUT.compact : LAYOUT.wide;
    this.group.position.set(0, layout.y, layout.z);
    this.group.scale.setScalar(layout.scale);
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (!this.finePointer || !this.motionAllowed) return;
    this.pointerActive = true;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
  };

  private readonly onMouseLeave = (): void => {
    this.pointerActive = false;
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.ripple(e.clientX, e.clientY, 1);
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
    if (this.pointerActive) count = this.resolveWell(count, this.pointerX, this.pointerY, WELL_RADIUS, WELL_DEPTH);
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
    while (expired < this.rippleCount && t - this.rippleStart[expired] >= RIPPLE_LIFETIME) expired++;
    if (expired) this.dropOldestRipples(expired);
  }

  private readonly onIntersect = (entries: IntersectionObserverEntry[]): void => {
    const entry = entries[entries.length - 1];
    if (!entry) return;
    this.onScreen = entry.isIntersecting;
    this.updateRunning();
  };

  private readonly updateRunning = (): void => {
    const shouldRun = this.motionAllowed && !this.destroyed && this.onScreen && !document.hidden;
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
    const { frame, plugins } = this;
    this.currentT = t;
    frame.t = t;
    frame.dt = Math.min(MAX_FRAME_DT, Math.max(0, t - this.lastT));
    frame.motion = this.motionAllowed;
    this.lastT = t;

    this.group.rotation.z = this.motionAllowed ? Math.sin(t * 0.12) * 0.03 : 0;

    for (let p = 0; p < plugins.length; p++) plugins[p].plugin.beforeFrame?.(frame);

    if (this.motionAllowed) {
      this.cameraPos.lerp(this.targetPos, CAMERA_EASE);
      this.cameraLook.lerp(this.targetLook, CAMERA_EASE);
      this.camera.position.copy(this.cameraPos);
      this.camera.lookAt(this.cameraLook);
    } else {
      this.snapCamera();
    }

    this.updateGroundPlane();
    const wellCount = this.resolveWells();
    this.expireRipples(t);
    prepareWaveFrame(this.waves, t);

    const { centers, heights, glow, well, baseColor, hoverColor } = this;
    const { activeX, activeY, activeRadiusSq, activeDepth } = this;
    const matrices = this.mesh.instanceMatrix.array as Float32Array;
    const colors = (this.mesh.instanceColor as InstancedBufferAttribute).array as Float32Array;
    const rippleCount = this.rippleCount;
    const count = COLS * ROWS;

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

      well[i] += (target - well[i]) * WELL_EASE;
      const lit = Math.min(1, well[i] / WELL_DEPTH);
      const wave = waveHeightAt(this.waves, i);

      let ring = 0;
      for (let r = 0; r < rippleCount; r++) {
        const age = t - this.rippleStart[r];
        const dx = cx - this.rippleX[r];
        const dy = cy - this.rippleY[r];
        const distToRing = Math.abs(Math.sqrt(dx * dx + dy * dy) - age * RIPPLE_SPEED);
        const front = Math.max(0, 1 - distToRing / RIPPLE_WIDTH);
        const decay = Math.max(0, 1 - age / RIPPLE_LIFETIME);
        ring += front * front * decay * this.rippleStrength[r];
      }

      const g = glow[i];
      const z = wave - well[i] + ring * RIPPLE_HEIGHT + g * GLOW_LIFT;
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
