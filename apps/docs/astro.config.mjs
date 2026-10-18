import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { codeFrame } from "./src/lib/code-frame.mjs";

const packageSource = (name) => fileURLToPath(new URL(`../../packages/${name}/src`, import.meta.url));
const grid = packageSource("spacetime-grid");
const skyline = packageSource("contribution-skyline");

export default defineConfig({
  site: "https://docs.abhiramkrishna.com",
  markdown: {
    shikiConfig: { theme: "night-owl", transformers: [codeFrame()] },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        { find: /^@abhiramkrishna\/spacetime-grid$/, replacement: `${grid}/index.ts` },
        { find: /^@abhiramkrishna\/spacetime-grid\/(vue|react|element)$/, replacement: `${grid}/$1/index.ts` },
        { find: /^@abhiramkrishna\/contribution-skyline$/, replacement: `${skyline}/index.ts` },
        { find: /^@abhiramkrishna\/contribution-skyline\/(vue|react|element|calendar|fetch)$/, replacement: `${skyline}/$1/index.ts` },
      ],
    },
  },
  integrations: [react(), mdx(), sitemap()],
});
