import type { SpacetimeGridOptions } from "@abhiramkrishna/spacetime-grid";
import { contributionCalendarHTML } from "../calendar";
import type { ContributionData } from "../data";
import { ContributionSkyline as SkylineCore } from "../Skyline";
import { SKYLINE_KEYS, liveSkylineOptions, pickSkylineOptions, progressValue, toKebab } from "../wrapper-utils";

export interface ContributionSkylineElement extends HTMLElement {
  readonly skyline: SkylineCore | null;
  data: ContributionData | null;
  progress: number | (() => number);
  grid: SpacetimeGridOptions | undefined;
}

export interface ContributionCalendarElement extends HTMLElement {
  data: ContributionData | null;
}

const skylineAttributes = new Map(SKYLINE_KEYS.map((key) => [toKebab(key), key] as const));
const THEME_ATTRIBUTES = new Map([["theme-base", "base"], ["theme-hover", "hover"], ["theme-fog", "fog"], ["theme-fresnel", "fresnel"]] as const);

async function loadJson(url: string, signal: AbortSignal): Promise<ContributionData> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  return (await res.json()) as ContributionData;
}

abstract class DataElement extends HTMLElement {
  protected value: ContributionData | null = null;
  private loading: AbortController | null = null;

  get data(): ContributionData | null {
    return this.value;
  }

  set data(value: ContributionData | null) {
    this.loading?.abort();
    this.value = value;
    this.dataChanged();
  }

  protected abstract dataChanged(): void;

  protected load(): void {
    const src = this.getAttribute("src");
    this.loading?.abort();
    if (!src) return;
    const controller = new AbortController();
    this.loading = controller;
    loadJson(src, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        this.value = data;
        this.dataChanged();
        this.dispatchEvent(new CustomEvent("load", { detail: data }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        this.dispatchEvent(new CustomEvent("error", { detail: error }));
      });
  }

  protected stopLoading(): void {
    this.loading?.abort();
    this.loading = null;
  }
}

export function defineContributionSkylineElement(tagName = "contribution-skyline"): CustomElementConstructor {
  const existing = customElements.get(tagName);
  if (existing) return existing;

  class Element extends DataElement implements ContributionSkylineElement {
    static observedAttributes = ["src", "progress", ...skylineAttributes.keys(), ...THEME_ATTRIBUTES.keys()];
    private instance: SkylineCore | null = null;
    private progressSource: number | (() => number) | undefined;
    private gridOptions: SpacetimeGridOptions | undefined;

    get skyline(): SkylineCore | null {
      return this.instance;
    }

    get progress(): number | (() => number) {
      return this.progressSource ?? progressValue(this.getAttribute("progress"));
    }

    set progress(value: number | (() => number)) {
      this.progressSource = value;
      this.instance?.setProgress(value);
    }

    get grid(): SpacetimeGridOptions | undefined {
      return this.gridOptions;
    }

    set grid(value: SpacetimeGridOptions | undefined) {
      this.gridOptions = value;
      if (this.instance) this.create();
    }

    connectedCallback(): void {
      if (!this.style.display) this.style.display = "block";
      if (this.value) this.create();
      else this.load();
    }

    disconnectedCallback(): void {
      this.stopLoading();
      this.teardown();
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
      if (oldValue === newValue || !this.isConnected) return;
      if (name === "src") this.load();
      else if (name === "progress") this.instance?.setProgress(this.progress);
      else this.instance?.setOptions(liveSkylineOptions(this.collect()));
    }

    protected dataChanged(): void {
      if (!this.isConnected) return;
      if (!this.value) this.teardown();
      else if (this.instance) this.instance.setData(this.value);
      else this.create();
    }

    private collect(): Record<string, unknown> {
      const source: Record<string, unknown> = {};
      for (const [attribute, key] of skylineAttributes) {
        const value = this.getAttribute(attribute);
        if (value !== null) source[key] = value;
      }
      const theme: Record<string, string> = {};
      for (const [attribute, key] of THEME_ATTRIBUTES) {
        const value = this.getAttribute(attribute);
        if (value !== null) theme[key] = value;
      }
      if (Object.keys(theme).length) source.theme = theme;
      return source;
    }

    private create(): void {
      this.teardown();
      if (!this.value || !this.isConnected) return;
      const instance = new SkylineCore(this, this.value, {
        ...pickSkylineOptions(this.collect()),
        progress: this.progress,
        grid: this.gridOptions,
      });
      this.instance = instance;
      this.dispatchEvent(new CustomEvent("ready", { detail: instance }));
    }

    private teardown(): void {
      this.instance?.destroy();
      this.instance = null;
    }
  }

  customElements.define(tagName, Element);
  return Element;
}

export function defineContributionCalendarElement(tagName = "contribution-calendar"): CustomElementConstructor {
  const existing = customElements.get(tagName);
  if (existing) return existing;

  class Element extends DataElement implements ContributionCalendarElement {
    static observedAttributes = ["src", "caption", "link", "locale"];

    connectedCallback(): void {
      if (this.value) this.render();
      else this.load();
    }

    disconnectedCallback(): void {
      this.stopLoading();
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
      if (oldValue === newValue || !this.isConnected) return;
      if (name === "src") this.load();
      else this.render();
    }

    protected dataChanged(): void {
      if (this.isConnected) this.render();
    }

    private render(): void {
      if (!this.value) {
        this.innerHTML = "";
        return;
      }
      this.innerHTML = contributionCalendarHTML(this.value, {
        caption: this.getAttribute("caption") !== "false",
        link: this.getAttribute("link") !== "false",
        locale: this.getAttribute("locale") ?? undefined,
      });
    }
  }

  customElements.define(tagName, Element);
  return Element;
}
