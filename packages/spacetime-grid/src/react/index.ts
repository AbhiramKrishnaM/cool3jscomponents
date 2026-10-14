import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from "react";
import { SpacetimeGrid as SpacetimeGridCore } from "../SpacetimeGrid";
import type { SpacetimeGridOptions } from "../options";
import type { GridPlugin } from "../types";
import { liveOptions, liveSignature, pickOptions, structuralSignature } from "../wrapper-utils";

export interface SpacetimeGridProps extends SpacetimeGridOptions {
  plugins?: readonly GridPlugin[];
  onReady?: (grid: SpacetimeGridCore) => void;
  className?: string;
  style?: CSSProperties;
}

export const SpacetimeGrid = forwardRef<SpacetimeGridCore | null, SpacetimeGridProps>(function SpacetimeGrid(props, ref) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [grid, setGrid] = useState<SpacetimeGridCore | null>(null);
  const structural = structuralSignature(props as Record<string, unknown>);
  const live = liveSignature(props as Record<string, unknown>);

  useEffect(() => {
    if (!container.current) return;
    const instance = new SpacetimeGridCore(container.current, pickOptions(latest.current as Record<string, unknown>));
    setGrid(instance);
    latest.current.onReady?.(instance);
    return () => {
      instance.destroy();
      setGrid(null);
    };
  }, [structural]);

  useEffect(() => {
    grid?.setOptions(liveOptions(latest.current as Record<string, unknown>));
  }, [grid, live]);

  useEffect(() => {
    if (!grid || !props.plugins) return;
    const removers = props.plugins.map((plugin) => grid.use(plugin));
    return () => removers.forEach((remove) => remove());
  }, [grid, props.plugins]);

  useImperativeHandle(ref, () => grid as SpacetimeGridCore, [grid]);

  return createElement("div", {
    ref: container,
    className: props.className,
    style: { width: "100%", height: "100%", ...props.style },
  });
});

export default SpacetimeGrid;
