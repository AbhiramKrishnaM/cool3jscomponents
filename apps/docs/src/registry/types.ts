import type { SnippetSpec } from "./snippet";

export interface ControlSchema {
  key: string;
  label: string;
  group: string;
  description: string;
  live: boolean;
  type: "number" | "boolean" | "color" | "select";
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  choices?: readonly string[];
}

export type Values = Record<string, unknown>;

export type Framework = "js" | "vue" | "react" | "element";

export type Badge = "new" | "updated";

export interface DemoInstance {
  apply(entry: ControlSchema, values: Values): void;
  destroy(): void;
}

export interface LoadedComponent {
  schema: readonly ControlSchema[];
  controls: readonly ControlSchema[];
  create(stage: HTMLElement, values: Values): Promise<DemoInstance>;
}

export interface Category {
  id: string;
  label: string;
}

export interface ComponentEntry {
  slug: string;
  name: string;
  category: string;
  description: string;
  keywords: readonly string[];
  addedAt: string;
  updatedAt?: string;
  packageName: string;
  install: readonly string[];
  guideHref: string;
  hint?: string;
  poster: ImageMetadata;
  snippet: SnippetSpec;
  load(): Promise<LoadedComponent>;
}
