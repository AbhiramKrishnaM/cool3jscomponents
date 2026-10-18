export async function copyText(button: HTMLButtonElement, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Press ⌘C";
  }
  window.setTimeout(() => (button.textContent = "Copy"), 1500);
}

export function initCopyButtons(scope: ParentNode): void {
  for (const button of scope.querySelectorAll<HTMLButtonElement>("[data-copy-text]")) {
    button.addEventListener("click", () => void copyText(button, button.dataset.copyText ?? ""));
  }
}
