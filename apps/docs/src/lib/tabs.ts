import { SYNC_KEY_PREFIX } from "@/lib/framework";

function stored(key: string): string | null {
  try {
    return localStorage.getItem(SYNC_KEY_PREFIX + key);
  } catch {
    return null;
  }
}

function store(key: string, label: string): void {
  try {
    localStorage.setItem(SYNC_KEY_PREFIX + key, label);
  } catch {
    return;
  }
}

function select(root: HTMLElement, label: string): boolean {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>(":scope > [role=tablist] > [data-tab]")];
  if (!tabs.some((tab) => tab.dataset.tab === label)) return false;
  for (const tab of tabs) tab.setAttribute("aria-selected", String(tab.dataset.tab === label));
  for (const panel of root.querySelectorAll<HTMLElement>(":scope > [data-tab-label]")) panel.hidden = panel.dataset.tabLabel !== label;
  return true;
}

export function initTabs(scope: ParentNode): void {
  const roots = [...scope.querySelectorAll<HTMLElement>("[data-tabs]:not([data-tabs-ready])")];
  for (const root of roots) {
    root.dataset.tabsReady = "";
    const key = root.dataset.syncKey;
    const remembered = key ? stored(key) : null;
    if (remembered) select(root, remembered);
    for (const tab of root.querySelectorAll<HTMLButtonElement>(":scope > [role=tablist] > [data-tab]")) {
      tab.addEventListener("click", () => {
        const label = tab.dataset.tab ?? "";
        if (!key) {
          select(root, label);
          return;
        }
        store(key, label);
        const before = tab.getBoundingClientRect().top;
        for (const other of document.querySelectorAll<HTMLElement>(`[data-tabs][data-sync-key="${key}"]`)) select(other, label);
        window.scrollBy(0, tab.getBoundingClientRect().top - before);
      });
    }
  }
}
