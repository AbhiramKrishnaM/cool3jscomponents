import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    vue: "src/vue/index.ts",
    react: "src/react/index.ts",
    element: "src/element/index.ts",
  },
  format: ["esm"],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: true,
  splitting: true,
  target: "es2022",
  external: ["three", "vue", "react"],
});
