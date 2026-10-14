import { defineConfig } from "tsup";

const shared = {
  format: ["esm"] as const,
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  target: "es2022",
  external: ["three", "@abhiramkrishna/spacetime-grid"],
};

export default defineConfig([
  {
    ...shared,
    entry: { index: "src/index.ts", fetch: "src/fetch/index.ts" },
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
