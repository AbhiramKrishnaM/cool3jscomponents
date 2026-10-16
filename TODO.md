# TODO — threejscomponents

See `PLAN.md` for the full plan.

## 0. Decisions (before anything is created)
- [ ] Project name — deferred (shortlist: Gravita, Starfold, Warp, Nebulo, Tessera, Orrery)
- [x] pnpm workspaces
- [x] Package names: scoped `@abhiramkrishna/spacetime-grid`, `@abhiramkrishna/contribution-skyline` — check availability on npm before publishing
- [x] Licence: MIT
- [ ] **[Abhiram]** `git init` + create the GitHub repo

## 1. Scaffold the monorepo
- [x] Workspace root `package.json`, shared ESLint/TS config
- [x] `packages/spacetime-grid` and `packages/contribution-skyline` skeletons with tsup builds (ESM + types)
- [x] `three` as a peer dependency
- [x] Changesets set up for versioning + publishing
- [x] `apps/docs` — Astro + Starlight shell, styled like the portfolio (Fira Code, `DESIGN.md` tokens)

## 2. spacetime-grid
- [x] Port the grid core from `Portfolio/src/components/background/SpaceTimeGrid.vue` (no Vue, no portfolio scroll code)
- [x] Core effects: idle waves, cursor gravity well, click ripples, fog, theme colours
- [x] Keep the per-tile tick allocation-free and trig-free (precomputed sin/cos); pause off-screen / when the tab is hidden
- [x] Plugin/hook API: camera poses per section, extra wells that follow an element, impulses, data overlays
- [x] Options: size/density, colours/theme, wave strength, well radius/depth, ripple speed/lifetime, fog, pixel-ratio cap, reduced motion
- [x] Wrappers: Vue, React, Web Component
- [x] README with usage + screenshots

## 3. contribution-skyline
- [x] Port the bars, rim shader, twinkle and spark/shard bursts from the portfolio grid
- [x] Standalone mode (own scene) + layer mode on `spacetime-grid`
- [x] Rise driven by a 0–1 progress value the host controls
- [x] Fetch helper for server / serverless / build time (username → JSON; optional token for private contributions, never in the browser) — based on `Portfolio/scripts/fetch-contributions.mjs`
- [x] Flat 2D calendar component as the lightweight option
- [x] Options: colours/theme, bar height scale, twinkle on/off, bursts on/off + frequency, reduced motion
- [x] Wrappers: Vue, React, Web Component
- [x] README with usage + screenshots

## 4. Docs site (Starlight version — superseded by §5, content reused)
- [x] Per package: overview, install, quick start, Vue / React / Web Component guides
- [x] Props/options reference tables (type, default, description)
- [x] Live playground per component: controls that change props in real time + a copy-paste snippet that updates with them
- [x] Each package exports an options schema — `SPACETIME_GRID_SCHEMA`, `CONTRIBUTION_SKYLINE_SCHEMA`

## 5. Showcase site redesign (React Bits–style; decided 2026-10-15)
Decided: Astro + React islands (drop Starlight's look), npm packages stay the install model, clean sans + Fira Code for code only, placeholder name for now. Libraries: Tailwind v4, shadcn/ui (Radix), Motion, cmdk, Shiki, Lucide. Take structure from reactbits.dev as inspiration only — no copied design or code.
- [x] Set up Tailwind v4 + React + shadcn/ui in `apps/docs`; design tokens (dark, one accent), sans + mono fonts
- [x] App shell: glassy sticky navbar, ⌘K search (cmdk), theme toggle, GitHub link
- [x] Component registry: one entry per component (name, slug, category, description, badges New/Updated, schema, demo, snippet spec)
- [x] Landing page: spacetime grid as the live hero background + code card that drives it, with presets; feature bento; live showcase cards; install steps (cards and "Tune" link to the guides until the component pages exist)
- [ ] Browse page: sidebar with category filters + filter box + grouped list with badges; grid of live preview cards; category + sort dropdowns
- [ ] Component page: Preview / Code toggle, device sizes + full screen, Customize panel (custom controls from the schema, replaces Tweakpane), props table, prev / next, copy code in 4 formats
- [ ] Move the written guides (getting started, data, plugins, API, frameworks) into the new shell as MDX
- [ ] Sandbox extras: presets, reset/randomise, shareable URL, GitHub username → skyline via the serverless handler, FPS / pause / reduced-motion toggle
- [ ] Recipes: theming, performance tuning, reduced motion, grid + skyline together
- [ ] Deploy on Vercel at `docs.abhiramkrishna.com` (DNS in Namecheap)

## 6. Release
- [ ] Publish both packages to npm via Changesets
- [ ] Link the docs from both READMEs and from the portfolio
- [ ] Switch the portfolio to the published packages (portfolio todo tasks 10–12)
