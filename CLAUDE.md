# CLAUDE.md

Guidance for Claude Code in this repository.

## What this is

A monorepo for two reusable three.js components extracted from Abhiram's portfolio, plus an Astro docs site. **Read `PLAN.md` (the what/why) and `TODO.md` (the steps) first.** Both packages are built; current work is the showcase-site redesign in `TODO.md` §5.

## The source of truth is the portfolio

Both packages are **ports of working code**, not new designs. Before writing anything, read the original:

- Portfolio repo: `/Users/abhiramkrishnam/Desktop/Master/Projects/Portfolio` (sibling folder, `../Portfolio`). Live: https://www.abhiramkrishna.com
- Start sessions with access to it: `claude --add-dir ../Portfolio` (or `/add-dir ../Portfolio` inside a session).
- Read the portfolio's own `CLAUDE.md` and `DESIGN.md` for context (its `CLAUDE.md` is git-ignored — it only exists locally).
- Port by reading and adapting the actual source. Don't rewrite from memory or from the descriptions here; behaviour, constants and shaders must match what's live.

### Where each piece lives today

All in `Portfolio/src/components/background/SpaceTimeGrid.vue` (~740 lines, Vue `<script setup>` + three.js) unless noted. Line numbers drift — search by name.

**spacetime-grid (core)**
- Grid constants: `COLS`, `ROWS`, `CELL`, `FILL`; theme colours `THEME_COLORS` + `applyThemeColors()`
- Instanced tiles: `buildGrid()`, shaders `gridVert` / `gridFrag` (fresnel rim, fog)
- Idle waves: `waveField`, `WAVE_*`, `precomputeWaves()`, `prepareWaveFrame()`, `waveHeightAt()` — precomputed per-tile sin/cos + angle addition. **Keep this approach**; it cut the grid's CPU share from ~18% to ~4.5%.
- Gravity well under the cursor: `WELL_RADIUS`, `WELL_DEPTH`, `WELL_EASE`, `wellFalloff()`, `onMouseMove`, `groundPointFromScreen()`, `updateGroundPlane()`
- Click ripples: `MAX_WAVES`, `WAVE_RING_*`, `spawnEnergyWave()`, `waveFromScreen()`, `onPointerDown`
- Loop / lifecycle: `init()`, `startLoop()` (the per-tile tick), `onResize()`, `applyResponsiveLayout()`
- Reduced motion + coarse pointer handling: `motionAllowed`, `finePointer`

**spacetime-grid (become opt-in plugins/hooks — portfolio-specific today)**
- Camera flight between section poses: `CAMERA_POSES`, `cameraSegments()`, `updateCameraTarget()` (reads `story.markers` from `Portfolio/src/composables/storyline.js`)
- Extra well following a DOM element: `TERMINAL_WELL_*`, `terminalWell()` (reads `story.flight`)
- External impulses: `consumeImpulses()` (reads `story.impulses`, fed by `pushImpulse()` in `storyline.js`)
- Day/night colours: `Portfolio/src/composables/dayPhase.js` sets the palette the grid reads — in the package this is just "set colours at runtime"

**contribution-skyline**
- Constants: `CONTRIB_*`, `BAR_HEIGHT`, `BAR_STAGGER`, `BURST_*`, `SPARK_*`, `SHARD_LIFE`
- Mapping days → tiles: `contributionOrigin()`, `mapContributions()` (53 weeks × 7 weekdays)
- Bars: `buildBars()`, `updateBars()`, shaders `barVert` / `barFrag` (UV rim = neon edges)
- Twinkle: `twinkle()` (each bar dips on its own 13–21 s cycle, product.inc style)
- Bursts: `createParticlePool()`, `emit()`, `burst()`, `shatter()`, `stepPool()`, `updateSparks()`
- Rise with scroll: `contributionStrength()` (portfolio-specific; becomes a 0–1 `progress` input)
- Data fetch: `Portfolio/scripts/fetch-contributions.mjs` (scrapes the public `github.com/users/<name>/contributions` page, no token; keeps the old file on failure)
- Data shape: `Portfolio/src/data/contributions.json` → `{ user, total, fetchedAt, days: [{ date, level, count }] }` — keep it
- 2D option: `Portfolio/src/components/about/ContributionCalendar.vue`

**Do not port** (they stay in the portfolio and have third-party licences): the Codrops cardboard box (`story/cardboardBox.js`, MIT) and the keyboard model (`public/models/keyboard.glb`, CC-BY by Benbop). These packages should be 100% original code.

## Docs site (`apps/docs`)

Astro + React islands + Tailwind v4. New pages use `src/layouts/Site.astro` (glass navbar, ⌘K search, theme toggle); the Starlight guides under `src/content/docs/` stay until they're migrated to the new shell.

- **Component registry** (`src/registry/`): one `ComponentEntry` per component (slug, name, category, description, keywords, `addedAt`/`updatedAt` → New/Updated badges, poster, snippet spec, and a lazy `load()` returning schema + controls + `create(stage, values)`). Adding a component = add an entry file and list it in `COMPONENTS` in `registry/index.ts`. Helpers: `getComponent`, `componentsByCategory`, `neighbours`, `badgeFor`, `componentHref` (`/components/<slug>/` — those pages don't exist yet), `snippet()` (JS / Vue / React / Web Component code from changed values), `defaultValues`, `pick`, `splitTheme` (`theme.*` keys → theme object).
- **Playground** (`src/components/Playground.astro`, `src/playground/`): `<Playground kind="<registry slug>" />`; it reads everything from the registry.
- **Landing page** (`src/pages/index.astro`, scripts in `src/landing/`): live grid hero with a preset-driven code card (`landing/presets.ts`), feature bento, live showcase cards (mounted while in view, destroyed when out, posters only under reduced motion), install steps. The hero is always dark, even in light mode. Cards link to the guides until the component pages exist.
- **Code highlighting:** Astro's `<Code>` from `astro:components` fails here with "Theme … is not included in this bundle" for every theme. Use `highlight()` from `src/lib/highlight.ts` (Shiki `codeToHtml`, `night-owl`, build time) with `<Fragment set:html>`. Give the wrapper `[&_pre]:overflow-x-auto`, and give grid children `min-w-0`, or long code lines push the page wider than a phone screen.
- **Check before ticking a step:** `pnpm typecheck`, `pnpm build`, `npx eslint`, then drive `pnpm preview` with Playwright at phone + desktop widths, dark + light, and check for console errors and `scrollWidth > innerWidth`.

## Rules carried over from the portfolio

- **No code comments** unless the user approves that specific comment first (JS, template or CSS). Express intent through naming. Empty `catch {}` fails `no-empty` — use `catch { return; }`.
- **Style:** double quotes, semicolons (`"quotes": ["error", "double"]`, `"semi": ["error", "always"]`).
- **Performance:** per-tile / per-particle work in the frame loop stays allocation-free and trig-free; reuse scratch `Vector3`s; pause when off-screen or the tab is hidden; cap the pixel ratio. Measure with a CPU-throttled (4×) Playwright run, not just Lighthouse.
- **Reduced motion:** every animation has a `prefers-reduced-motion` fallback.
- **Secrets:** never put a GitHub token in browser code. Tokens only live in the fetch helper that runs on a server, serverless function or at build time.
- **Storage:** wrap any `localStorage`/`sessionStorage` access in try/catch.
- **Licence hygiene:** only CC0 / CC-BY / MIT assets, credited in the README.

## Decided vs open

Decided: monorepo (`packages/spacetime-grid`, `packages/contribution-skyline`, `apps/docs`), tsup builds (ESM + types), `three` as a peer dependency, Changesets for releases, an Astro + React-islands showcase site (React Bits–style; Tailwind v4, shadcn/ui, Motion, cmdk, Shiki, Lucide; Starlight's look dropped) deployed on Vercel at `docs.abhiramkrishna.com`, framework-agnostic core with Vue / React / Web Component wrappers, and a `/sandbox` page in the docs whose controls and props tables are both generated from an options schema each package exports.

Also decided: pnpm workspaces, scoped package names (`@abhiramkrishna/spacetime-grid`, `@abhiramkrishna/contribution-skyline`), MIT licence.

Open: the project name (deferred — `threejscomponents` is a working name). Ask the user — don't pick silently.

## Working style

- Plan in `TODO.md`; tick items off as they're done.
- Don't create folders/packages before the user asks — they want to review the plan first.
- Verify visually: build the docs/demo and drive it with Playwright (WebGL works headlessly with `playwright-core` and the cached `~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`, launched with `--use-gl=angle --enable-unsafe-swiftshader --ignore-gpu-blocklist`).
