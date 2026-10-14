import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://docs.abhiramkrishna.com",
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
