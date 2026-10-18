import type { Framework } from "@/registry/types";

export const FRAMEWORK_LABELS: Record<Framework, string> = { js: "JavaScript", vue: "Vue", react: "React", element: "Web Component" };
export const FRAMEWORKS = Object.keys(FRAMEWORK_LABELS) as Framework[];

const SYNC_KEY = "starlight-synced-tabs__framework";

export function storedFramework(): Framework {
  try {
    const label = localStorage.getItem(SYNC_KEY);
    return FRAMEWORKS.find((key) => FRAMEWORK_LABELS[key] === label) ?? "js";
  } catch {
    return "js";
  }
}

export function storeFramework(framework: Framework): void {
  try {
    localStorage.setItem(SYNC_KEY, FRAMEWORK_LABELS[framework]);
  } catch {
    return;
  }
}
