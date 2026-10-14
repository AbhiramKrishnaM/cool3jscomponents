import { defineConfig } from "tsup";

const shared = {
  format: ["esm"] as const,
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  target: "es2022",
  external: ["three", "@abhiramkrishna/spacetime-grid", "vue", "react"],
};

export default defineConfig([
  {
    ...shared,
    entry: {
      index: "src/index.ts",
      fetch: "src/fetch/index.ts",
      calendar: "src/calendar/index.ts",
      vue: "src/vue/index.ts",
      react: "src/react/index.ts",
      element: "src/element/index.ts",
    },
    clean: true,
    splitting: true,
  },
  {
    ...shared,
    entry: { cli: "src/fetch/cli.ts" },
    dts: false,
    platform: "node",
    banner: { js: "#!/usr/bin/env node" },
  },
]);
