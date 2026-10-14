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
- [ ] `apps/docs` — Astro + Starlight shell, styled like the portfolio (Fira Code, `DESIGN.md` tokens)

## 2. spacetime-grid
- [ ] Port the grid core from `Portfolio/src/components/background/SpaceTimeGrid.vue` (no Vue, no portfolio scroll code)
- [ ] Core effects: idle waves, cursor gravity well, click ripples, fog, theme colours
- [ ] Keep the per-tile tick allocation-free and trig-free (precomputed sin/cos); pause off-screen / when the tab is hidden
- [ ] Plugin/hook API: camera poses per section, extra wells that follow an element, impulses, data overlays
- [ ] Options: size/density, colours/theme, wave strength, well radius/depth, ripple speed/lifetime, fog, pixel-ratio cap, reduced motion
- [ ] Wrappers: Vue, React, Web Component
- [ ] README with usage + screenshots

## 3. contribution-skyline
- [ ] Port the bars, rim shader, twinkle and spark/shard bursts from the portfolio grid
- [ ] Standalone mode (own scene) + layer mode on `spacetime-grid`
- [ ] Rise driven by a 0–1 progress value the host controls
- [ ] Fetch helper for server / serverless / build time (username → JSON; optional token for private contributions, never in the browser) — based on `Portfolio/scripts/fetch-contributions.mjs`
- [ ] Flat 2D calendar component as the lightweight option
- [ ] Options: colours/theme, bar height scale, twinkle on/off, bursts on/off + frequency, reduced motion
- [ ] Wrappers: Vue, React, Web Component
- [ ] README with usage + screenshots

## 4. Docs site
- [ ] Per package: overview, install, quick start, Vue / React / Web Component guides
- [ ] Props/options reference tables (type, default, description)
- [ ] Live playground per component: controls that change props in real time + a copy-paste snippet that updates with them
- [ ] Recipes: theming, performance tuning, reduced motion, grid + skyline together
- [ ] Deploy on Vercel at `docs.abhiramkrishna.com` (DNS in Namecheap)

## 5. Sandbox page (docs site)
- [ ] Each package exports an options schema (name, type, default, min/max/step, group, description)
- [ ] Generate the docs props tables from the same schema
- [ ] `/sandbox` page: full-size live canvas + control panel (bottom sheet on phones)
- [ ] Component switcher: grid, skyline, grid + skyline
- [ ] Controls generated from the schema: sliders, colour pickers, toggles, dropdowns, text input
- [ ] Live updates without remounting where possible; rebuild only for structural changes (e.g. grid size)
- [ ] Presets (Portfolio default, Calm, Neon, Day/Dusk/Night), reset, randomise
- [ ] Shareable URL holding the current settings
- [ ] "Copy code" for the current props (Vue / React / Web Component / plain JS) + "Open in StackBlitz"
- [ ] Skyline: enter any GitHub username → fetched via the docs' serverless helper (no token in the browser)
- [ ] FPS readout, pause, reduced-motion toggle
- [ ] Decide control library: Tweakpane (themed) vs custom

## 6. Release
- [ ] Publish both packages to npm via Changesets
- [ ] Link the docs from both READMEs and from the portfolio
- [ ] Switch the portfolio to the published packages (portfolio todo tasks 10–12)
