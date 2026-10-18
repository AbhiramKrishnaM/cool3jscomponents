import { copyText } from "@/lib/copy";
import { initShowcase } from "@/landing/showcase";

function initCodeCopy(scope: ParentNode): void {
  for (const button of scope.querySelectorAll<HTMLButtonElement>("[data-copy-code]")) {
    button.addEventListener("click", () => {
      const code = button.closest(".code-frame")?.querySelector("pre")?.textContent ?? "";
      void copyText(button, code);
    });
  }
}

function initToc(scope: ParentNode): void {
  const links = [...scope.querySelectorAll<HTMLAnchorElement>("[data-toc-link]")];
  const targets = links.map((link) => document.getElementById(link.dataset.tocLink ?? "")).filter((target): target is HTMLElement => target !== null);
  if (!targets.length) return;
  const update = (): void => {
    const line = 120;
    let current = targets[0]!;
    for (const target of targets) if (target.getBoundingClientRect().top <= line) current = target;
    for (const link of links) link.toggleAttribute("data-active", link.dataset.tocLink === current.id);
  };
  let queued = false;
  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  }, { passive: true });
  update();
}

export function initGuide(scope: ParentNode): void {
  initCodeCopy(scope);
  initToc(scope);
  initShowcase(scope);
}
