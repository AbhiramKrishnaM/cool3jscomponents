import type { ControlSchema, Values } from "./types";

export function pick(schema: readonly ControlSchema[], keys: readonly string[]): ControlSchema[] {
  return keys.map((key) => {
    const entry = schema.find((candidate) => candidate.key === key);
    if (!entry) throw new Error(`Unknown option ${key}`);
    return entry;
  });
}

export function splitTheme(values: Values): { options: Values; theme: Record<string, unknown> } {
  const options: Values = {};
  const theme: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith("theme.")) theme[key.slice(6)] = value;
    else options[key] = value;
  }
  return { options, theme };
}

export function defaultValues(controls: readonly ControlSchema[]): Values {
  return Object.fromEntries(controls.map((entry) => [entry.key, entry.default]));
}
