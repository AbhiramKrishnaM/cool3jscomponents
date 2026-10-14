import { createElement, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties } from "react";
import type { SpacetimeGridOptions } from "@abhiramkrishna/spacetime-grid";
import { contributionCalendarHTML, type ContributionCalendarOptions } from "../calendar";
import type { ContributionData } from "../data";
import { ContributionSkyline as SkylineCore, type ContributionSkylineLiveOptions } from "../Skyline";
import { liveSkylineOptions, liveSkylineSignature, pickSkylineOptions, progressValue } from "../wrapper-utils";

export interface ContributionSkylineProps extends ContributionSkylineLiveOptions {
  data: ContributionData;
  grid?: SpacetimeGridOptions;
  onReady?: (skyline: SkylineCore) => void;
  className?: string;
  style?: CSSProperties;
}

export const ContributionSkyline = forwardRef<SkylineCore | null, ContributionSkylineProps>(function ContributionSkyline(props, ref) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [skyline, setSkyline] = useState<SkylineCore | null>(null);
  const gridKey = JSON.stringify(props.grid ?? null);
  const live = liveSkylineSignature(props as unknown as Record<string, unknown>);

  useEffect(() => {
    if (!container.current) return;
    const current = latest.current;
    const instance = new SkylineCore(container.current, current.data, {
      ...pickSkylineOptions(current as unknown as Record<string, unknown>),
      progress: progressValue(current.progress),
      grid: current.grid,
    });
    setSkyline(instance);
    current.onReady?.(instance);
    return () => {
      instance.destroy();
      setSkyline(null);
    };
  }, [gridKey]);

  useEffect(() => {
    skyline?.setData(props.data);
  }, [skyline, props.data]);

  useEffect(() => {
    skyline?.setProgress(progressValue(props.progress));
  }, [skyline, props.progress]);

  useEffect(() => {
    skyline?.setOptions(liveSkylineOptions(latest.current as unknown as Record<string, unknown>));
  }, [skyline, live]);

  useImperativeHandle(ref, () => skyline as SkylineCore, [skyline]);

  return createElement("div", {
    ref: container,
    className: props.className,
    style: { width: "100%", height: "100%", ...props.style },
  });
});

export interface ContributionCalendarProps extends ContributionCalendarOptions {
  data: ContributionData;
  className?: string;
}

export function ContributionCalendar(props: ContributionCalendarProps) {
  const { data, caption, link, locale, className } = props;
  const html = useMemo(() => contributionCalendarHTML(data, { caption, link, locale }), [data, caption, link, locale]);
  return createElement("div", { className, dangerouslySetInnerHTML: { __html: html } });
}
