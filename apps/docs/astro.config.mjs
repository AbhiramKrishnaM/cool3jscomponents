import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

const packageSource = (name) => fileURLToPath(new URL(`../../packages/${name}/src`, import.meta.url));
const grid = packageSource("spacetime-grid");
const skyline = packageSource("contribution-skyline");

export default defineConfig({
  site: "https://docs.abhiramkrishna.com",
  vite: {
    resolve: {
      alias: [
        { find: /^@abhiramkrishna\/spacetime-grid$/, replacement: `${grid}/index.ts` },
        { find: /^@abhiramkrishna\/spacetime-grid\/(vue|react|element)$/, replacement: `${grid}/$1/index.ts` },
        { find: /^@abhiramkrishna\/contribution-skyline$/, replacement: `${skyline}/index.ts` },
        { find: /^@abhiramkrishna\/contribution-skyline\/(vue|react|element|calendar|fetch)$/, replacement: `${skyline}/$1/index.ts` },
      ],
    },
  },
  integrations: [
    starlight({
      title: "threejscomponents",
      description: "Reusable three.js components from abhiramkrishna.com: the spacetime grid and the contribution skyline.",
      customCss: ["@fontsource/fira-code/400.css", "@fontsource/fira-code/600.css", "./src/styles/theme.css"],
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/AbhiramKrishnaM" },
      ],
      sidebar: [
        { label: "Spacetime grid", items: [{ autogenerate: { directory: "spacetime-grid" } }] },
        { label: "Contribution skyline", items: [{ autogenerate: { directory: "contribution-skyline" } }] },
      ],
    }),
  ],
});
