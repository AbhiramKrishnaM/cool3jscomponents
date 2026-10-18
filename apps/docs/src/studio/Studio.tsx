import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Code2, Copy, Eye, Maximize2, Minimize2, Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FRAMEWORKS, FRAMEWORK_LABELS, storeFramework, storedFramework } from "@/lib/framework";
import { cn } from "@/lib/utils";
import { defaultValues, getComponent, snippet, type ControlSchema, type DemoInstance, type Framework, type LoadedComponent, type Values } from "@/registry";
import { Controls } from "./Controls";
import { highlightSnippet } from "./highlighter";

type View = "preview" | "code";
type Device = "desktop" | "tablet" | "mobile";

const DEVICES: { id: Device; label: string; width: string; Icon: typeof Monitor }[] = [
  { id: "desktop", label: "Desktop", width: "100%", Icon: Monitor },
  { id: "tablet", label: "Tablet", width: "768px", Icon: Tablet },
  { id: "mobile", label: "Phone", width: "390px", Icon: Smartphone },
];

const REBUILD_DELAY = 180;

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

function useDemo(loaded: LoadedComponent | null, stage: React.RefObject<HTMLDivElement | null>, values: React.RefObject<Values>) {
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
      const created = await loaded.create(host, { ...values.current });
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
    instance.current?.apply(entry, values.current);
  }, [values]);

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
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rebuildTimer = useRef(0);

  useEffect(() => {
    setFramework(storedFramework());
    let current = true;
    void entry?.load().then((result) => {
      if (!current) return;
      valuesRef.current = defaultValues(result.controls);
      setValues(valuesRef.current);
      setLoaded(result);
    });
    return () => {
      current = false;
    };
  }, [entry]);

  const { live, rebuild, apply } = useDemo(loaded, stage, valuesRef);

  useEffect(() => () => window.clearTimeout(rebuildTimer.current), []);

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

  const reset = (): void => {
    if (!loaded) return;
    valuesRef.current = defaultValues(loaded.controls);
    setValues(valuesRef.current);
    rebuild();
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
          <Button variant="ghost" size="icon-sm" aria-label="Reset options" title="Reset options" onClick={reset} disabled={!loaded}>
            <RotateCcw />
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
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 id="customize" className="font-medium">Customize</h2>
          <p className="text-xs text-muted-foreground">Changes show live and update the code.</p>
        </div>
        {loaded
          ? <Controls controls={loaded.controls} values={values} onChange={change} />
          : <p className="text-sm text-muted-foreground">Loading controls…</p>}
      </section>
    </div>
  );
}
