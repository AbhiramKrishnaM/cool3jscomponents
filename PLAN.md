# threejscomponents — plan

A monorepo for reusable three.js components that started life in the portfolio (`../Portfolio`, live at https://www.abhiramkrishna.com), plus a docs site that shows them off with live, tweakable demos.

Nothing is scaffolded yet — this file and `TODO.md` are the plan. Run `git init` once the open decisions below are made.

## Why

Two pieces of the portfolio are general enough for anyone to use:

1. **Spacetime grid** — the animated 3D grid background.
2. **Contribution skyline** — your GitHub contributions rendered as glowing 3D bars on the grid.

Publishing them as npm packages, with a proper docs site, turns portfolio work into open-source work people can install.

## Package 1 — `spacetime-grid`

Source today: `Portfolio/src/components/background/SpaceTimeGrid.vue`.

**Core (always on)**
- Instanced grid of tiles with idle waves, fog, theme colours
- Cursor gravity well (tiles sink under the cursor)
- Click ripples (energy rings spreading across the grid)

**Opt-in extras (plugins / hooks)**
- Camera poses per page section (camera flies between them on scroll)
- Extra gravity wells that follow a DOM element (e.g. the flying terminal)
- Impulses pushed from outside (e.g. an object landing on the grid)
- Data overlays on the tiles (e.g. the contribution skyline)

**Options**
- Grid size/density, colours (or a full theme object), wave strength, well radius/depth, ripple speed/lifetime, fog range, pixel-ratio cap
- Reduced-motion fallback (static grid)

**Must keep (performance rules learned in the portfolio)**
- Per-tile tick stays allocation-free and trig-free: idle waves use precomputed per-tile sin/cos + angle addition, not `Math.sin` per tile per frame. This took the grid from ~18% to ~4.5% CPU.
- Pause when off-screen / tab hidden.

**Leave behind (portfolio-specific)**
- `storyline.js` scroll markers, the `node_modules` box impulses wiring, the hard-coded section camera poses — these become examples of the plugin API, not core code.

## Package 2 — `contribution-skyline`

Source today: the contribution bars + particles inside `SpaceTimeGrid.vue`, the fetch script `Portfolio/scripts/fetch-contributions.mjs`, and the flat calendar `Portfolio/src/components/about/ContributionCalendar.vue`.

**What it does**
- Maps a year of contributions onto a 53 × 7 block (weeks × weekdays)
- One instanced bar per active day; height = contribution level; neon-edge rim shader
- Bars rise week by week (driven by a 0–1 progress value the host controls, e.g. scroll)
- product.inc-style twinkle (each bar dips on its own 13–21 s cycle)
- Busiest-day bars periodically flash and burst into pixels that fall and shatter into smaller fading pixels on the grid
- 2D flat calendar as the lightweight / mobile option

**Works two ways**
- Standalone (its own small scene), or
- As a layer on `spacetime-grid` (uses the grid's tile positions)

**Data / credentials**
- Default input is a **GitHub username** — public contributions need **no token** (scraped from `github.com/users/<name>/contributions`, same as the portfolio's build script).
- An optional GitHub token only matters for private contributions, and it must **never** ship to the browser. Provide a small fetch helper for a server / serverless function / build step; the component itself only receives the JSON.
- Keep the JSON shape from the portfolio: `{ user, total, fetchedAt, days: [{ date, level, count }] }`.

**Options**
- Colours/theme, bar height scale, twinkle on/off, bursts on/off (+ frequency), rise progress, reduced-motion fallback

## Showcase site — `apps/docs`

A component showcase in the spirit of [reactbits.dev](https://www.reactbits.dev): the components are the product, shown live and full size, with docs around them. Structure is inspired by React Bits; design and code are our own.

**Stack (decided 2026-10-15):** Astro with React islands for anything interactive. Static pages stay static; MDX for the written guides. Starlight's look is dropped; its written content moves into the new shell.
**Libraries:** Tailwind CSS v4, shadcn/ui (Radix primitives), Motion, cmdk (⌘K search), Shiki (code), Lucide (icons).
**Look:** dark, spacious, one accent colour. A clean sans for text; Fira Code only for code and small labels. Name and logo are placeholders until the project name is picked.

**Pages**
- **Landing:** the spacetime grid as the live hero background, with a code card beside the headline whose values drive it, plus presets. Then a feature bento, live showcase cards and install steps.
- **Browse:** sidebar with category filters, a filter box and the components grouped by category (New / Updated badges); a grid of live preview cards; category and sort dropdowns.
- **Component page:** title and description, Preview / Code toggle, device sizes and full screen, a Customize panel of custom controls generated from the schema, the props table, copy code in four formats (JS, Vue, React, Web Component), previous / next.
- **Guides:** getting started, data, plugins, API and framework pages, moved from the Starlight version.

**Component registry:** one entry per component (name, slug, category, description, badges, schema, demo, snippet spec), so adding a component means adding a package and one registry entry.

**Sandbox extras:** presets, reset / randomise, shareable URL, any GitHub username → skyline through the serverless handler, FPS readout, pause, reduced-motion toggle.

**Install model:** npm packages (unchanged); no copy-source registry.

Deployed on Vercel at `docs.abhiramkrishna.com`; linked from the portfolio and both READMEs.

## Planned layout (not created yet)

```
threejscomponents/
  package.json                workspace root
  packages/
    spacetime-grid/
      src/                    framework-agnostic three.js core
      src/vue/                Vue wrapper
      src/react/              React wrapper
      src/element/            Web Component wrapper
    contribution-skyline/
      src/                    core + layer for spacetime-grid
      src/fetch/              server/build-time fetch helper (no tokens in the browser)
      src/vue/ src/react/ src/element/
  apps/
    docs/                     Astro + Starlight, imports the packages from source; includes the /sandbox page
  .changeset/                 versioning + changelogs
```

## Tooling

- **Workspaces:** pnpm
- **Build:** tsup → ESM + `.d.ts` types per package
- **three.js:** peer dependency (users bring their own version); wrappers' frameworks are optional peers
- **Releases:** Changesets for version bumps, changelogs and `npm publish`
- **Docs:** Astro + Starlight; the docs app depends on the workspace packages, so playgrounds always run the latest source
- **Deploy:** Vercel builds `apps/docs`

## Open decisions

1. **Project name** — deferred; pick later (shortlist so far: Gravita, Starfold, Warp, Nebulo, Tessera, Orrery). `threejscomponents` is a working name only.
2. ~~pnpm or npm workspaces?~~ **Decided: pnpm.**
3. ~~Package names?~~ **Decided: scoped** — `@abhiramkrishna/spacetime-grid`, `@abhiramkrishna/contribution-skyline`. Check availability on npm before publishing.
4. ~~Licence?~~ **Decided: MIT.** Both packages are original code (the Codrops cardboard box and the CC-BY keyboard model stay in the portfolio and are **not** part of these packages).

## Build order

1. Scaffold the monorepo + an empty docs shell
2. Extract **spacetime-grid** (portfolio task 11)
3. Extract **contribution-skyline** (portfolio task 10)
4. Fill the docs: props tables, playgrounds, recipes (portfolio task 12)
5. Rebuild the docs as the showcase site (landing, browse, component pages, sandbox extras)
6. Publish both packages to npm
7. Switch the portfolio over to the published packages
