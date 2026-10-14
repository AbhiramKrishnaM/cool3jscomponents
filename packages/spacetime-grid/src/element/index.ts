import { SpacetimeGrid as SpacetimeGridCore } from "../SpacetimeGrid";
import type { SpacetimeGridOptions } from "../options";
import type { GridPlugin } from "../types";
import { SETTING_KEYS, STRUCTURAL_KEYS, THEME_KEYS, liveOptions, pickOptions, toKebab } from "../wrapper-utils";

export interface SpacetimeGridElement extends HTMLElement {
  readonly grid: SpacetimeGridCore | null;
  options: SpacetimeGridOptions;
  use(plugin: GridPlugin): () => void;
}

const settingAttributes = new Map(SETTING_KEYS.map((key) => [toKebab(key), key] as const));
const themeAttributes = new Map(THEME_KEYS.map((key) => [`theme-${toKebab(key)}`, key] as const));
const structuralAttributes = new Set(STRUCTURAL_KEYS.map((key) => toKebab(key)));
const observedAttributes = [...settingAttributes.keys(), ...themeAttributes.keys()];

export function defineSpacetimeGridElement(tagName = "spacetime-grid"): CustomElementConstructor {
  const existing = customElements.get(tagName);
  if (existing) return existing;

  class Element extends HTMLElement implements SpacetimeGridElement {
    static observedAttributes = observedAttributes;
    private instance: SpacetimeGridCore | null = null;
    private extraOptions: SpacetimeGridOptions = {};
    private readonly plugins = new Map<GridPlugin, (() => void) | null>();

    get grid(): SpacetimeGridCore | null {
      return this.instance;
    }

    get options(): SpacetimeGridOptions {
      return this.extraOptions;
    }

    set options(value: SpacetimeGridOptions) {
      const before = this.collect();
      this.extraOptions = { ...value };
      this.refresh(before);
    }

    use(plugin: GridPlugin): () => void {
      this.plugins.set(plugin, this.instance ? this.instance.use(plugin) : null);
      return () => {
        this.plugins.get(plugin)?.();
        this.plugins.delete(plugin);
      };
    }

    connectedCallback(): void {
      if (!this.style.display) this.style.display = "block";
      this.create();
    }

    disconnectedCallback(): void {
      this.teardown();
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
      if (!this.instance || oldValue === newValue) return;
      if (structuralAttributes.has(name)) this.create();
      else this.instance.setOptions(liveOptions(this.collect() as Record<string, unknown>));
    }

    private collect(): SpacetimeGridOptions {
      const source: Record<string, unknown> = {};
      for (const [attribute, key] of settingAttributes) {
        const value = this.getAttribute(attribute);
        if (value !== null) source[key] = value;
      }
      const theme: Record<string, string> = {};
      for (const [attribute, key] of themeAttributes) {
        const value = this.getAttribute(attribute);
        if (value !== null) theme[key] = value;
      }
      const fromAttributes = pickOptions({ ...source, theme });
      const fromProperty = pickOptions(this.extraOptions as Record<string, unknown>);
      return { ...fromAttributes, ...fromProperty, theme: { ...fromAttributes.theme, ...fromProperty.theme } };
    }

    private refresh(before: SpacetimeGridOptions): void {
      if (!this.instance) return;
      const after = this.collect();
      const structuralChanged = STRUCTURAL_KEYS.some((key) => before[key] !== after[key]);
      if (structuralChanged) this.create();
      else this.instance.setOptions(liveOptions(after as Record<string, unknown>));
    }

    private create(): void {
      this.teardown();
      if (!this.isConnected) return;
      const instance = new SpacetimeGridCore(this, this.collect());
      this.instance = instance;
      for (const plugin of this.plugins.keys()) this.plugins.set(plugin, instance.use(plugin));
      this.dispatchEvent(new CustomEvent("ready", { detail: instance }));
    }

    private teardown(): void {
      for (const [plugin, remove] of this.plugins) {
        remove?.();
        this.plugins.set(plugin, null);
      }
      this.instance?.destroy();
      this.instance = null;
    }
  }

  customElements.define(tagName, Element);
  return Element;
}
