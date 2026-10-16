import { Pane } from "tweakpane";
import type { ControlSchema, Values } from "@/registry/types";

export interface PanelHandle {
  refresh(): void;
  dispose(): void;
}

export function createPanel(
  container: HTMLElement,
  controls: readonly ControlSchema[],
  values: Values,
  onChange: (entry: ControlSchema) => void,
): PanelHandle {
  const pane = new Pane({ container });
  const folders = new Map<string, ReturnType<Pane["addFolder"]>>();
  const groups = [...new Set(controls.map((entry) => entry.group))];
  const single = groups.length === 1;

  for (const entry of controls) {
    let parent: Pane | ReturnType<Pane["addFolder"]> = pane;
    if (!single) {
      let folder = folders.get(entry.group);
      if (!folder) {
        folder = pane.addFolder({ title: entry.group });
        folders.set(entry.group, folder);
      }
      parent = folder;
    }
    const params: Record<string, unknown> = { label: entry.label };
    if (entry.type === "number") Object.assign(params, { min: entry.min, max: entry.max, step: entry.step });
    if (entry.type === "select") params.options = Object.fromEntries((entry.choices ?? []).map((choice) => [choice, choice]));
    if (entry.type === "color") params.view = "color";
    const binding = parent.addBinding(values, entry.key, params);
    binding.on("change", () => onChange(entry));
  }

  return {
    refresh: () => pane.refresh(),
    dispose: () => pane.dispose(),
  };
}
