import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

export const collections = {
  docs: defineCollection({
    loader: glob({
      pattern: "**/*.mdx",
      base: "./src/content/docs",
      generateId: ({ entry }) => entry.replace(/\.mdx$/, "").replace(/\/index$/, ""),
    }),
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      tableOfContents: z.boolean().optional(),
      sidebar: z.object({ label: z.string().optional(), order: z.number().optional() }).optional(),
    }),
  }),
};
