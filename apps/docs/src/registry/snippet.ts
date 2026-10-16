import type { ControlSchema, Framework, Values } from "./types";

export interface SnippetSpec {
  importPath: string;
  name: string;
  tag: string;
  elementImport: string;
  elementDefine: string;
  dataArgument?: { js: string; vue: string; react: string; element: string };
  container: string;
}

function decimals(step: number | undefined): number {
  if (!step || step >= 1) return 0;
  return Math.min(4, Math.ceil(-Math.log10(step)));
}

function formatNumber(value: number, entry: ControlSchema): string {
  return String(Number(value.toFixed(decimals(entry.step))));
}

export function changedValues(controls: readonly ControlSchema[], values: Values): { options: [ControlSchema, unknown][]; theme: [string, unknown][] } {
  const options: [ControlSchema, unknown][] = [];
  const theme: [string, unknown][] = [];
  for (const entry of controls) {
    const value = values[entry.key];
    const same = entry.type === "number"
      ? Math.abs((value as number) - (entry.default as number)) < 1e-9
      : value === entry.default;
    if (same) continue;
    if (entry.key.startsWith("theme.")) theme.push([entry.key.slice(6), value]);
    else options.push([entry, value]);
  }
  return { options, theme };
}

const kebab = (key: string): string => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function literal(entry: ControlSchema, value: unknown, quote: string): string {
  if (entry.type === "number") return formatNumber(value as number, entry);
  if (entry.type === "boolean") return String(value);
  return `${quote}${String(value)}${quote}`;
}

export function snippet(framework: Framework, spec: SnippetSpec, controls: readonly ControlSchema[], values: Values): string {
  const { options, theme } = changedValues(controls, values);

  if (framework === "js") {
    const lines = options.map(([entry, value]) => `  ${entry.key}: ${literal(entry, value, "\"")},`);
    if (theme.length) lines.push(`  theme: { ${theme.map(([key, value]) => `${key}: "${String(value)}"`).join(", ")} },`);
    const args = [spec.container, spec.dataArgument?.js].filter(Boolean).join(", ");
    const body = lines.length ? `, {\n${lines.join("\n")}\n}` : "";
    return `import { ${spec.name} } from "${spec.importPath}";\n\nnew ${spec.name}(${args}${body});`;
  }

  if (framework === "vue") {
    const attrs = options.map(([entry, value]) =>
      entry.type === "color" || entry.type === "select" ? `${kebab(entry.key)}="${String(value)}"` : `:${kebab(entry.key)}="${literal(entry, value, "'")}"`);
    if (spec.dataArgument) attrs.unshift(spec.dataArgument.vue);
    if (theme.length) attrs.push(`:theme="{ ${theme.map(([key, value]) => `${key}: '${String(value)}'`).join(", ")} }"`);
    const tag = attrs.length > 2 ? `<${spec.name}\n    ${attrs.join("\n    ")}\n  />` : `<${spec.name}${attrs.length ? ` ${attrs.join(" ")}` : ""} />`;
    return `<script setup lang="ts">\nimport { ${spec.name} } from "${spec.importPath}/vue";\n</script>\n\n<template>\n  ${tag}\n</template>`;
  }

  if (framework === "react") {
    const attrs = options.map(([entry, value]) =>
      entry.type === "color" || entry.type === "select" ? `${entry.key}="${String(value)}"` : `${entry.key}={${literal(entry, value, "\"")}}`);
    if (spec.dataArgument) attrs.unshift(spec.dataArgument.react);
    if (theme.length) attrs.push(`theme={{ ${theme.map(([key, value]) => `${key}: "${String(value)}"`).join(", ")} }}`);
    const tag = attrs.length > 2 ? `<${spec.name}\n  ${attrs.join("\n  ")}\n/>` : `<${spec.name}${attrs.length ? ` ${attrs.join(" ")}` : ""} />`;
    return `import { ${spec.name} } from "${spec.importPath}/react";\n\n${tag}`;
  }

  const attrs = options.map(([entry, value]) =>
    entry.type === "boolean" ? (value ? kebab(entry.key) : `${kebab(entry.key)}="false"`) : `${kebab(entry.key)}="${literal(entry, value, "")}"`);
  if (spec.dataArgument) attrs.unshift(spec.dataArgument.element);
  for (const [key, value] of theme) attrs.push(`theme-${key}="${String(value)}"`);
  const open = attrs.length > 2 ? `<${spec.tag}\n  ${attrs.join("\n  ")}\n>` : `<${spec.tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
  return `import { ${spec.elementDefine} } from "${spec.importPath}/element";\n${spec.elementDefine}();\n\n${open}</${spec.tag}>`;
}
