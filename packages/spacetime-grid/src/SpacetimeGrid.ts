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
  Raycaster,
  Scene,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  WebGLRenderer,
  type ColorRepresentation,
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
  LAYOUT,
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
import { createWaveField, prepareWaveFrame, waveHeightAt, type WaveField } from "./waves";

export interface SpacetimeGridTheme {
  base: ColorRepresentation;
  hover: ColorRepresentation;
  fog: ColorRepresentation;
  fresnel: ColorRepresentation;
}

export interface SpacetimeGridOptions {
  theme?: Partial<SpacetimeGridTheme>;
}

export const DEFAULT_THEME: SpacetimeGridTheme = {
  base: "#0c1f33",
  hover: "#43d9ad",
  fog: "#011627",
  fresnel: "#bfe9ff",
};

interface GridUniforms {
  [name: string]: { value: unknown };
  uFresnelColor: { value: Color };
  uOpacity: { value: number };
}

const WELL_RADIUS_SQ = WELL_RADIUS * WELL_RADIUS;

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

  private readonly mesh: InstancedMesh<PlaneGeometry, ShaderMaterial>;
  private readonly uniforms: GridUniforms;
  private readonly fog: Fog;
  private readonly theme: SpacetimeGridTheme;
  private readonly baseColor = new Color();
  private readonly hoverColor = new Color();
  private readonly well: Float32Array;
  private readonly waves: WaveField;
  private readonly rippleX = new Float32Array(MAX_RIPPLES);
  private readonly rippleY = new Float32Array(MAX_RIPPLES);
  private readonly rippleStart = new Float32Array(MAX_RIPPLES);
  private readonly rippleStrength = new Float32Array(MAX_RIPPLES);
  private rippleCount = 0;

  private readonly raycaster = new Raycaster();
  private readonly groundPlane = new Plane();
  private readonly planeNormal = new Vector3();
  private readonly groundPoint = new Vector3();
  private readonly ndc = new Vector2();
  private readonly cameraPos = new Vector3();
  private readonly cameraLook = new Vector3();
  private readonly targetPos = new Vector3();
  private readonly targetLook = new Vector3();

  private readonly ownsCanvas: boolean;
  private readonly sizeTarget: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly visibilityObserver: IntersectionObserver;
  private readonly motionAllowed: boolean;
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
    this.cameraPos.fromArray(CAMERA_POSE.pos);
    this.cameraLook.fromArray(CAMERA_POSE.look);
    this.targetPos.copy(this.cameraPos);
    this.targetLook.copy(this.cameraLook);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.cameraLook);

    this.group = new Group();
    this.group.rotation.x = -Math.PI * 0.42;
    this.scene.add(this.group);

    const count = COLS * ROWS;
    this.centers = new Float32Array(count * 2);
    this.heights = new Float32Array(count);
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
    else this.renderFrame(0);
  }

  get isRunning(): boolean {
    return this.running;
  }

  setTheme(theme: Partial<SpacetimeGridTheme>): void {
    Object.assign(this.theme, theme);
    this.applyTheme();
    if (!this.motionAllowed) this.renderFrame(0);
  }

  ripple(clientX: number, clientY: number, strength = 1): void {
    if (!this.motionAllowed) return;
    if (!this.clientToNdc(clientX, clientY)) return;
    this.updateGroundPlane();
    if (this.groundPointAt(this.ndc.x, this.ndc.y, this.groundPoint)) {
      this.spawnRipple(this.groundPoint.x, this.groundPoint.y, strength);
    }
  }

  resize(): void {
    if (this.destroyed) return;
    const { width, height } = this.measure();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.applyLayout(width);
    if (!this.motionAllowed) this.renderFrame(0);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
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
    this.currentT = t;
    this.group.rotation.z = this.motionAllowed ? Math.sin(t * 0.12) * 0.03 : 0;

    this.cameraPos.lerp(this.targetPos, CAMERA_EASE);
    this.cameraLook.lerp(this.targetLook, CAMERA_EASE);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.cameraLook);

    this.updateGroundPlane();

    let hasPointer = false;
    let px = 0;
    let py = 0;
    if (this.pointerActive && this.clientToNdc(this.pointerX, this.pointerY)
      && this.groundPointAt(this.ndc.x, this.ndc.y, this.groundPoint)) {
      hasPointer = true;
      px = this.groundPoint.x;
      py = this.groundPoint.y;
    }

    this.expireRipples(t);
    prepareWaveFrame(this.waves, t);

    const { centers, heights, well, baseColor, hoverColor } = this;
    const matrices = this.mesh.instanceMatrix.array as Float32Array;
    const colors = (this.mesh.instanceColor as InstancedBufferAttribute).array as Float32Array;
    const rippleCount = this.rippleCount;
    const count = COLS * ROWS;

    for (let i = 0; i < count; i++) {
      const cx = centers[i * 2];
      const cy = centers[i * 2 + 1];

      let target = 0;
      if (hasPointer) {
        const dx = cx - px;
        const dy = cy - py;
        const distSq = dx * dx + dy * dy;
        if (distSq < WELL_RADIUS_SQ) {
          const k = 1 - distSq / WELL_RADIUS_SQ;
          target += k * k * WELL_DEPTH;
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

      const z = wave - well[i] + ring * RIPPLE_HEIGHT;
      heights[i] = z;
      const m = i * 16;
      matrices[m + 12] = cx;
      matrices[m + 13] = cy;
      matrices[m + 14] = z;

      const shade = 1 + wave * 0.9;
      const c = i * 3;
      colors[c] = Math.min(1, (baseColor.r + (hoverColor.r - baseColor.r) * lit) * shade + hoverColor.r * ring);
      colors[c + 1] = Math.min(1, (baseColor.g + (hoverColor.g - baseColor.g) * lit) * shade + hoverColor.g * ring);
      colors[c + 2] = Math.min(1, (baseColor.b + (hoverColor.b - baseColor.b) * lit) * shade + hoverColor.b * ring);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    (this.mesh.instanceColor as InstancedBufferAttribute).needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }
}
