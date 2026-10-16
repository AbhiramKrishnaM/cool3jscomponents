import { createPanel } from "./panel";
import { defaultValues, getComponent, snippet, type Framework } from "@/registry";

const FRAMEWORK_LABELS: Record<Framework, string> = { js: "JavaScript", vue: "Vue", react: "React", element: "Web Component" };
const SYNC_KEY = "starlight-synced-tabs__framework";

function storedFramework(): Framework {
  try {
    const label = localStorage.getItem(SYNC_KEY);
    const match = (Object.keys(FRAMEWORK_LABELS) as Framework[]).find((key) => FRAMEWORK_LABELS[key] === label);
    return match ?? "js";
  } catch {
    return "js";
  }
}

function storeFramework(framework: Framework): void {
  try {
    localStorage.setItem(SYNC_KEY, FRAMEWORK_LABELS[framework]);
  } catch {
    return;
  }
}

async function mount(root: HTMLElement): Promise<void> {
  const entry = getComponent(root.dataset.playground ?? "");
  if (!entry) return;
  const kind = await entry.load();
  const stage = root.querySelector<HTMLElement>("[data-stage]")!;
  const panelHost = root.querySelector<HTMLElement>("[data-panel]")!;
  const code = root.querySelector<HTMLElement>("[data-code]")!;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>("[data-framework]")];
  const copy = root.querySelector<HTMLButtonElement>("[data-copy]")!;
  const reset = root.querySelector<HTMLButtonElement>("[data-reset]")!;

  const defaults = () => defaultValues(kind.controls);
  const values = defaults();
  let framework = storedFramework();
  let instance = await kind.create(stage, values);

  const render = (): void => {
    code.textContent = snippet(framework, entry.snippet, kind.controls, values);
    for (const tab of tabs) tab.setAttribute("aria-selected", String(tab.dataset.framework === framework));
  };

  const rebuild = async (): Promise<void> => {
    instance.destroy();
    instance = await kind.create(stage, values);
  };

  const panel = createPanel(panelHost, kind.controls, values, (control) => {
    if (control.live) instance.apply(control, values);
    else void rebuild();
    render();
  });

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      framework = tab.dataset.framework as Framework;
      storeFramework(framework);
      render();
    });
  }

  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent ?? "");
      copy.textContent = "Copied";
    } catch {
      copy.textContent = "Copy failed";
    }
    setTimeout(() => { copy.textContent = "Copy"; }, 1500);
  });

  reset.addEventListener("click", async () => {
    Object.assign(values, defaults());
    panel.refresh();
    await rebuild();
    render();
  });

  root.dataset.ready = "true";
  render();
}

export function initPlaygrounds(): void {
  const roots = document.querySelectorAll<HTMLElement>("[data-playground]:not([data-ready])");
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      void mount(entry.target as HTMLElement);
    }
  }, { rootMargin: "200px" });
  roots.forEach((root) => observer.observe(root));
}
