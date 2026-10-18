import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Code2, Copy, Eye, Link2, Maximize2, Minimize2, Monitor, Pause, Play, RotateCcw, Shuffle, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FRAMEWORKS, FRAMEWORK_LABELS, storeFramework, storedFramework } from "@/lib/framework";
import { cn } from "@/lib/utils";
import { defaultValues, getComponent, snippet, type ControlSchema, type DemoInstance, type Framework, type LoadedComponent, type Values } from "@/registry";
import { Controls } from "./Controls";
import { highlightSnippet } from "./highlighter";
import { matchingPreset, presetValues, randomValues, searchFromValues, valuesFromSearch } from "./sandbox";

type View = "preview" | "code";
type Device = "desktop" | "tablet" | "mobile";

const DEVICES: { id: Device; label: string; width: string; Icon: typeof Monitor }[] = [
  { id: "desktop", label: "Desktop", width: "100%", Icon: Monitor },
  { id: "tablet", label: "Tablet", width: "768px", Icon: Tablet },
  { id: "mobile", label: "Phone", width: "390px", Icon: Smartphone },
];

const REBUILD_DELAY = 180;
const URL_DELAY = 250;

const MOTION: ControlSchema = {
  key: "reducedMotion",
  label: "Reduced motion",
  group: "Motion",
  description: "",
  live: true,
  type: "select",
  default: "auto",
  choices: ["auto", "always", "never"],
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useFps(active: boolean): number | null {
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    if (!active) {
      setFps(null);
      return;
    }
    let frames = 0;
    let since = performance.now();
    let id = requestAnimationFrame(function count(now) {
      frames += 1;
      if (now - since >= 500) {
        setFps(Math.round((frames * 1000) / (now - since)));
        frames = 0;
        since = now;
      }
      id = requestAnimationFrame(count);
    });
    return () => cancelAnimationFrame(id);
  }, [active]);
  return fps;
}

const segment = "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm dark:aria-selected:bg-secondary dark:aria-pressed:bg-secondary";

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }, () => setCopied(false));
  }, []);
  return [copied, copy];
}

function useDemo(loaded: LoadedComponent | null, stage: React.RefObject<HTMLDivElement | null>, values: React.RefObject<Values>, motion: React.RefObject<string>) {
  const [live, setLive] = useState(false);
  const instance = useRef<DemoInstance | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const disposed = useRef(false);

  const rebuild = useCallback(() => {
    if (!loaded || !stage.current) return;
    const host = stage.current;
    queue.current = queue.current.then(async () => {
      instance.current?.destroy();
      instance.current = null;
      if (disposed.current) return;
      const created = await loaded.create(host, { ...values.current, reducedMotion: motion.current });
      if (disposed.current) created.destroy();
      else {
        instance.current = created;
        setLive(true);
      }
    }).catch((error: unknown) => console.error(error));
  }, [loaded, stage, values]);

  useEffect(() => {
    disposed.current = false;
    rebuild();
    return () => {
      disposed.current = true;
      queue.current = queue.current.then(() => {
        instance.current?.destroy();
        instance.current = null;
      });
    };
  }, [rebuild]);

  const apply = useCallback((entry: ControlSchema) => {
    instance.current?.apply(entry, { ...values.current, reducedMotion: motion.current });
  }, [values, motion]);

  return { live, rebuild, apply };
}

function CodeView({ code, framework, onFramework }: { code: string; framework: Framework; onFramework: (framework: Framework) => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, copy] = useCopy();

  useEffect(() => {
    let current = true;
    void highlightSnippet(code, framework).then((result) => {
      if (current) setHtml(result);
    });
    return () => {
      current = false;
    };
  }, [code, framework]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-stage">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5">
        <div role="tablist" aria-label="Code format" className="flex min-w-0 gap-0.5 overflow-x-auto">
          {FRAMEWORKS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === framework}
              className="shrink-0 rounded-md px-2.5 py-1 font-mono text-xs whitespace-nowrap text-white/55 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-selected:bg-white/10 aria-selected:text-white"
              onClick={() => onFramework(id)}
            >
              {FRAMEWORK_LABELS[id]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={() => copy(code)}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto text-[13px] leading-relaxed [&_pre]:!bg-transparent [&_pre]:p-4">
        {html
          ? <div dangerouslySetInnerHTML={{ __html: html }} />
          : <pre className="text-white/80"><code>{code}</code></pre>}
      </div>
    </div>
  );
}

export function Studio({ slug, poster }: { slug: string; poster: string }) {
  const entry = useMemo(() => getComponent(slug), [slug]);
  const [loaded, setLoaded] = useState<LoadedComponent | null>(null);
  const [values, setValues] = useState<Values>({});
  const valuesRef = useRef<Values>({});
  const [view, setView] = useState<View>("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const [framework, setFramework] = useState<Framework>("js");
  const [fullscreen, setFullscreen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rebuildTimer = useRef(0);
  const motionRef = useRef("auto");
  const [shared, share] = useCopy();

  useEffect(() => {
    setFramework(storedFramework());
    if (prefersReducedMotion()) {
      setSystemReduced(true);
      setPaused(true);
    }
    let current = true;
    void entry?.load().then((result) => {
      if (!current) return;
      valuesRef.current = valuesFromSearch(result.controls, location.search);
      setValues(valuesRef.current);
      setLoaded(result);
    });
    return () => {
      current = false;
    };
  }, [entry]);

  motionRef.current = paused ? "always" : systemReduced ? "never" : "auto";
  const { live, rebuild, apply } = useDemo(loaded, stage, valuesRef, motionRef);
  const fps = useFps(live && !paused && view === "preview");

  useEffect(() => () => window.clearTimeout(rebuildTimer.current), []);

  useEffect(() => {
    if (live) apply(MOTION);
  }, [paused, live, apply]);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      history.replaceState(history.state, "", `${location.pathname}${searchFromValues(loaded.controls, valuesRef.current)}${location.hash}`);
    }, URL_DELAY);
    return () => window.clearTimeout(timer);
  }, [loaded, values]);

  useEffect(() => {
    const sync = (): void => {
      if (!document.fullscreenElement && fullscreen && document.fullscreenEnabled) setFullscreen(false);
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && fullscreen && !document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", sync);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      window.removeEventListener("keydown", escape);
    };
  }, [fullscreen]);

  const change = useCallback((control: ControlSchema, value: unknown) => {
    valuesRef.current = { ...valuesRef.current, [control.key]: value };
    setValues(valuesRef.current);
    if (control.live) apply(control);
    else {
      window.clearTimeout(rebuildTimer.current);
      rebuildTimer.current = window.setTimeout(rebuild, REBUILD_DELAY);
    }
  }, [apply, rebuild]);

  const replaceValues = (next: Values): void => {
    window.clearTimeout(rebuildTimer.current);
    valuesRef.current = next;
    setValues(next);
    rebuild();
  };

  const reset = (): void => {
    if (loaded) replaceValues(defaultValues(loaded.controls));
  };

  const randomise = (): void => {
    if (loaded) replaceValues(randomValues(loaded.controls));
  };

  const shareLink = (): void => {
    if (!loaded) return;
    share(`${location.origin}${location.pathname}${searchFromValues(loaded.controls, valuesRef.current)}`);
  };

  const toggleFullscreen = (): void => {
    if (fullscreen) {
      if (document.fullscreenElement) void document.exitFullscreen();
      setFullscreen(false);
      return;
    }
    setView("preview");
    setFullscreen(true);
    if (document.fullscreenEnabled) void frame.current?.requestFullscreen().catch(() => undefined);
  };

  const chooseFramework = (next: Framework): void => {
    setFramework(next);
    storeFramework(next);
  };

  if (!entry) return null;
  const presets = entry.presets ?? [];
  const activePreset = loaded ? matchingPreset(loaded.controls, presets, values) : "default";
  const code = loaded ? snippet(framework, entry.snippet, loaded.controls, values) : "";
  const width = fullscreen ? "100%" : DEVICES.find((candidate) => candidate.id === device)!.width;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="View" className="inline-flex rounded-md border bg-secondary/60 p-0.5">
          <button type="button" role="tab" aria-selected={view === "preview"} className={segment} onClick={() => setView("preview")}>
            <Eye className="size-3.5" /> Preview
          </button>
          <button type="button" role="tab" aria-selected={view === "code"} className={segment} onClick={() => setView("code")}>
            <Code2 className="size-3.5" /> Code
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div role="group" aria-label="Preview size" className={cn("hidden rounded-md border bg-secondary/60 p-0.5 md:inline-flex", view === "code" && "md:hidden")}>
            {DEVICES.map(({ id, label, Icon }) => (
              <button key={id} type="button" aria-pressed={device === id} aria-label={label} title={label} className={segment} onClick={() => setDevice(id)}>
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={paused ? "Play" : "Pause"} title={paused ? "Play" : "Pause (shows the still frame reduced-motion visitors get)"} aria-pressed={paused} onClick={() => setPaused(!paused)}>
            {paused ? <Play /> : <Pause />}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Full screen" title="Full screen" onClick={toggleFullscreen}>
            <Maximize2 />
          </Button>
        </div>
      </div>

      <div className="relative h-[26rem] overflow-hidden rounded-xl border bg-secondary/40 sm:h-[34rem]">
        <div
          ref={frame}
          className={cn(
            "dark mx-auto h-full max-w-full overflow-hidden bg-stage transition-[width] duration-300",
            device !== "desktop" && !fullscreen && "border-x border-white/10",
            fullscreen && "fixed inset-0 z-50 h-dvh",
            view === "code" && !fullscreen && "hidden",
          )}
          style={{ width }}
        >
          <div className="relative h-full">
            <img src={poster} alt="" className={cn("absolute inset-0 size-full object-cover transition-opacity duration-700", live && "opacity-0")} />
            <div ref={stage} className="absolute inset-0" />
            {entry.hint && <p className="pointer-events-none absolute bottom-3 left-4 font-mono text-xs text-white/45">{entry.hint}</p>}
            {live && (
              <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/40 px-2 py-1 font-mono text-[11px] text-white/70 tabular-nums backdrop-blur" aria-live="off">
                {paused ? "Still frame" : fps === null ? "– fps" : `${fps} fps`}
              </span>
            )}
            {fullscreen && (
              <button
                type="button"
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-white backdrop-blur transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={toggleFullscreen}
              >
                <Minimize2 className="size-3.5" /> Exit full screen
              </button>
            )}
          </div>
        </div>
        {view === "code" && (
          <div className="dark absolute inset-0">
            <CodeView code={code} framework={framework} onFramework={chooseFramework} />
          </div>
        )}
      </div>

      <section aria-labelledby="customize" className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="customize" className="font-medium">Customize</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Changes show live, update the code and the page URL.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={randomise} disabled={!loaded}><Shuffle /> Randomise</Button>
            <Button variant="ghost" size="sm" onClick={shareLink} disabled={!loaded}>{shared ? <Check /> : <Link2 />} {shared ? "Copied" : "Share"}</Button>
            <Button variant="ghost" size="icon-sm" aria-label="Reset options" title="Reset options" onClick={reset} disabled={!loaded}><RotateCcw /></Button>
          </div>
        </div>
        {presets.length > 0 && (
          <div role="group" aria-label="Presets" className="mb-6 flex flex-wrap gap-2">
            {[{ id: "default", label: "Default", values: {} }, ...presets].map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={activePreset === preset.id}
                disabled={!loaded}
                className="rounded-full border px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 aria-pressed:border-primary/50 aria-pressed:bg-primary/10 aria-pressed:text-foreground"
                onClick={() => loaded && replaceValues(presetValues(loaded.controls, preset))}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
        {loaded
          ? <Controls controls={loaded.controls} values={values} onChange={change} />
          : <p className="text-sm text-muted-foreground">Loading controls…</p>}
      </section>
    </div>
  );
}
