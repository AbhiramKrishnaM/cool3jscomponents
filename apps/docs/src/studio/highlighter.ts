import type { HighlighterCore } from "shiki/core";
import type { Framework } from "@/registry";

const LANGUAGES: Record<Framework, string> = { js: "typescript", vue: "vue", react: "tsx", element: "html" };

let highlighter: Promise<HighlighterCore> | undefined;

function load(): Promise<HighlighterCore> {
  highlighter ??= Promise.all([
    import("shiki/core"),
    import("shiki/engine/javascript"),
  ]).then(([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) => createHighlighterCore({
    themes: [import("shiki/themes/night-owl.mjs")],
    langs: [
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/tsx.mjs"),
      import("shiki/langs/vue.mjs"),
      import("shiki/langs/html.mjs"),
    ],
    engine: createJavaScriptRegexEngine(),
  }));
  return highlighter;
}

export async function highlightSnippet(code: string, framework: Framework): Promise<string> {
  const core = await load();
  return core.codeToHtml(code, { lang: LANGUAGES[framework], theme: "night-owl" });
}
