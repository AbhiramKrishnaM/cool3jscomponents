const TITLE = /title="([^"]+)"/;

const LANGUAGE_LABELS = { sh: "Terminal", bash: "Terminal", ts: "TypeScript", tsx: "TSX", js: "JavaScript", vue: "Vue", html: "HTML", css: "CSS", json: "JSON", astro: "Astro" };

export function codeFrame() {
  return {
    name: "code-frame",
    root(root) {
      const pre = root.children.find((node) => node.type === "element" && node.tagName === "pre");
      if (!pre) return;
      const title = this.options.meta?.__raw?.match(TITLE)?.[1];
      const lang = this.options.lang;
      const caption = title ?? LANGUAGE_LABELS[lang] ?? lang;
      root.children = [{
        type: "element",
        tagName: "figure",
        properties: { class: "code-frame" },
        children: [
          {
            type: "element",
            tagName: "figcaption",
            properties: {},
            children: [
              { type: "element", tagName: "span", properties: {}, children: [{ type: "text", value: caption }] },
              { type: "element", tagName: "button", properties: { type: "button", "data-copy-code": "" }, children: [{ type: "text", value: "Copy" }] },
            ],
          },
          pre,
        ],
      }];
    },
  };
}
