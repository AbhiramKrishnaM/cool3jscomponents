import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, PointsMaterial, type Color } from "three";

export interface ParticlePool {
  points: Points<BufferGeometry, PointsMaterial>;
  positions: Float32Array;
  colors: Float32Array;
  vel: Float32Array;
  life: Float32Array;
  maxLife: Float32Array;
  max: number;
  next: number;
}

export function createParticlePool(max: number, size: number): ParticlePool {
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    size,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return { points, positions, colors, vel: new Float32Array(max * 3), life: new Float32Array(max), maxLife: new Float32Array(max), max, next: 0 };
}

export function emit(pool: ParticlePool, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number): void {
  const i = pool.next;
  pool.next = (pool.next + 1) % pool.max;
  const o = i * 3;
  pool.positions[o] = x;
  pool.positions[o + 1] = y;
  pool.positions[o + 2] = z;
  pool.vel[o] = vx;
  pool.vel[o + 1] = vy;
  pool.vel[o + 2] = vz;
  pool.life[i] = life;
  pool.maxLife[i] = life;
}

export function stepPool(pool: ParticlePool, dt: number, gravity: number, tint: Color, onLand: ((x: number, y: number) => void) | null): void {
  const { positions, colors, vel, life, maxLife } = pool;
  const r = Math.min(1, tint.r * 1.3 + 0.35);
  const g = Math.min(1, tint.g * 1.3 + 0.35);
  const b = Math.min(1, tint.b * 1.3 + 0.35);
  for (let i = 0; i < pool.max; i++) {
    const o = i * 3;
    if (life[i] <= 0) {
      colors[o] = colors[o + 1] = colors[o + 2] = 0;
      positions[o + 2] = -50;
      continue;
    }
    life[i] -= dt;
    vel[o + 2] -= gravity * dt;
    positions[o] += vel[o] * dt;
    positions[o + 1] += vel[o + 1] * dt;
    positions[o + 2] += vel[o + 2] * dt;
    if (onLand && positions[o + 2] <= 0.02 && vel[o + 2] < 0) {
      onLand(positions[o], positions[o + 1]);
      life[i] = 0;
      colors[o] = colors[o + 1] = colors[o + 2] = 0;
      continue;
    }
    const fade = onLand ? 1 : Math.max(0, life[i] / maxLife[i]);
    colors[o] = r * fade;
    colors[o + 1] = g * fade;
    colors[o + 2] = b * fade;
  }
  pool.points.geometry.attributes.position.needsUpdate = true;
  pool.points.geometry.attributes.color.needsUpdate = true;
}

export function disposePool(pool: ParticlePool): void {
  pool.points.geometry.dispose();
  pool.points.material.dispose();
  pool.points.removeFromParent();
}
