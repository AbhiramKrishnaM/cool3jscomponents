import type { SpacetimeGrid } from "./SpacetimeGrid";
import type { CameraPose, GridPlugin, WellOptions } from "./types";

export interface ScrollSegment<Name extends string = string> {
  from: Name;
  to: Name;
  start: number;
  end: number;
}

export interface ScrollCameraOptions<Name extends string> {
  poses: Record<Name, CameraPose>;
  initial: Name;
  segments: () => readonly ScrollSegment<Name>[];
  scroll?: () => number;
}

const easeInOut = (t: number): number => t * t * (3 - 2 * t);

function progressBetween(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (value - start) / (end - start)));
}

function lerpInto(out: [number, number, number], a: readonly number[], b: readonly number[], t: number): void {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
}

export function scrollCamera<Name extends string>(options: ScrollCameraOptions<Name>): GridPlugin {
  const { poses, initial, segments } = options;
  const readScroll = options.scroll ?? (() => window.scrollY);
  const position: [number, number, number] = [0, 0, 0];
  const lookAt: [number, number, number] = [0, 0, 0];
  const target: CameraPose = { position, lookAt };
  let grid: SpacetimeGrid | null = null;

  return {
    setup(g) {
      grid = g;
      g.setCameraTarget(poses[initial], { immediate: true });
      return () => { grid = null; };
    },
    beforeFrame(frame) {
      if (!grid) return;
      let fromPose = poses[initial];
      let toPose = fromPose;
      let t = 0;
      if (frame.motion) {
        const scroll = readScroll();
        const list = segments();
        for (let i = 0; i < list.length; i++) {
          const seg = list[i];
          const segT = progressBetween(scroll, seg.start, seg.end);
          if (segT <= 0) break;
          fromPose = poses[seg.from];
          toPose = poses[seg.to];
          t = easeInOut(segT);
        }
      }
      lerpInto(position, fromPose.position, toPose.position, t);
      lerpInto(lookAt, fromPose.lookAt, toPose.lookAt, t);
      grid.setCameraTarget(target);
    },
  };
}

export interface ElementWellOptions {
  radius?: number;
  depth?: number;
  strength?: () => number;
}

export function elementWell(element: Element | (() => Element | null | undefined), options: ElementWellOptions = {}): GridPlugin {
  const resolve = typeof element === "function" ? element : () => element;
  const wellOptions: WellOptions = { radius: options.radius, depth: options.depth, strength: 1 };
  let grid: SpacetimeGrid | null = null;

  return {
    setup(g) {
      grid = g;
      return () => { grid = null; };
    },
    beforeFrame(frame) {
      if (!grid || !frame.motion) return;
      const el = resolve();
      if (!el) return;
      const strength = options.strength ? options.strength() : 1;
      if (!(strength > 0)) return;
      const rect = el.getBoundingClientRect();
      wellOptions.strength = strength;
      grid.addWell(rect.left + rect.width / 2, rect.top + rect.height / 2, wellOptions);
    },
  };
}
