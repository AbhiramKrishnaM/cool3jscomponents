import { defaultValues, getComponent, type DemoInstance } from "@/registry";

async function mount(card: HTMLElement): Promise<DemoInstance | undefined> {
  const entry = getComponent(card.dataset.showcase ?? "");
  const stage = card.querySelector<HTMLElement>("[data-showcase-stage]");
  if (!entry || !stage) return undefined;
  const loaded = await entry.load();
  const instance = await loaded.create(stage, defaultValues(loaded.controls));
  card.dataset.live = "";
  return instance;
}

export function initShowcase(scope: ParentNode): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const live = new Map<HTMLElement, Promise<DemoInstance | undefined>>();
  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const card = target as HTMLElement;
      if (isIntersecting && !live.has(card)) live.set(card, mount(card));
      else if (!isIntersecting && live.has(card)) {
        const pending = live.get(card)!;
        live.delete(card);
        delete card.dataset.live;
        void pending.then((instance) => instance?.destroy());
      }
    }
  }, { rootMargin: "200px 0px" });
  for (const card of scope.querySelectorAll<HTMLElement>("[data-showcase]")) observer.observe(card);
}
