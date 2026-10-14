import type { ContributionData } from "../data";

export interface ContributionCalendarOptions {
  caption?: boolean;
  link?: boolean;
  locale?: string;
}

export interface ContributionCalendarHandle {
  update(data: ContributionData): void;
  destroy(): void;
}

const LEVEL_MIX = ["", "35%", "55%", "80%", "100%"];

const ROOT_STYLE = [
  "display:flex",
  "flex-direction:column",
  "gap:0.75rem",
  "font:inherit",
].join(";");

const CAPTION_STYLE = [
  "display:flex",
  "flex-wrap:wrap",
  "align-items:baseline",
  "justify-content:space-between",
  "gap:0.5rem",
  "margin:0",
  "font-size:0.875rem",
  "color:var(--cs-text, #7890aa)",
].join(";");

const GRID_STYLE = [
  "display:grid",
  "grid-template-rows:repeat(7, var(--cs-cell-size, 0.6rem))",
  "grid-auto-flow:column",
  "grid-auto-columns:var(--cs-cell-size, 0.6rem)",
  "gap:var(--cs-gap, 2px)",
  "overflow-x:auto",
  "scrollbar-width:none",
].join(";");

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function cellStyle(level: number): string {
  const background = level > 0
    ? `var(--cs-level-${level}, color-mix(in srgb, var(--cs-accent, #43d9ad) ${LEVEL_MIX[level]}, transparent))`
    : "var(--cs-empty, #1e2d3d)";
  return `border-radius:var(--cs-radius, 2px);background:${background}`;
}

function leadingBlanks(firstDate: string | undefined): number {
  if (!firstDate) return 0;
  const day = new Date(`${firstDate}T00:00:00Z`).getUTCDay();
  return Number.isFinite(day) ? day : 0;
}

function plural(count: number, word: string): string {
  return `${word}${count === 1 ? "" : "s"}`;
}

export function contributionCalendarHTML(data: ContributionData, options: ContributionCalendarOptions = {}): string {
  const locale = options.locale ?? "en-US";
  const total = data.total.toLocaleString(locale);
  const user = escapeHtml(data.user);
  const label = `${total} GitHub ${plural(data.total, "contribution")} in the last year`;

  const parts: string[] = [`<div class="contribution-calendar" style="${ROOT_STYLE}">`];
  if (options.caption !== false) {
    parts.push(`<div class="contribution-calendar__caption" style="${CAPTION_STYLE}">`);
    parts.push(`<p style="margin:0"><span style="color:var(--cs-strong, #e5e9f0)">${total} ${plural(data.total, "contribution")}</span> in the last year</p>`);
    if (options.link !== false && data.user) {
      parts.push(`<a href="https://github.com/${encodeURIComponent(data.user)}" target="_blank" rel="noopener noreferrer" style="color:var(--cs-link, inherit);text-decoration:none">@${user} ↗</a>`);
    }
    parts.push("</div>");
  }
  parts.push(`<div class="contribution-calendar__grid" role="img" aria-label="${escapeHtml(label)}" style="${GRID_STYLE}">`);
  for (let i = leadingBlanks(data.days[0]?.date); i > 0; i--) parts.push("<span aria-hidden=\"true\"></span>");
  for (const day of data.days) {
    const level = Math.min(4, Math.max(0, day.level));
    const title = `${day.count.toLocaleString(locale)} ${plural(day.count, "contribution")} on ${day.date}`;
    parts.push(`<span class="contribution-calendar__day" data-level="${level}" title="${escapeHtml(title)}" style="${cellStyle(level)}"></span>`);
  }
  parts.push("</div></div>");
  return parts.join("");
}

export function renderContributionCalendar(container: HTMLElement, data: ContributionData, options: ContributionCalendarOptions = {}): ContributionCalendarHandle {
  container.innerHTML = contributionCalendarHTML(data, options);
  return {
    update(next) {
      container.innerHTML = contributionCalendarHTML(next, options);
    },
    destroy() {
      container.innerHTML = "";
    },
  };
}
