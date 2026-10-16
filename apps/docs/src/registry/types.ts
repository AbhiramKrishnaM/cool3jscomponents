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
