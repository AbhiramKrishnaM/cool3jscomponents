import { codeToHtml, type BundledLanguage } from "shiki";

export function highlight(code: string, lang: BundledLanguage = "ts"): Promise<string> {
  return codeToHtml(code, { lang, theme: "night-owl" });
}
