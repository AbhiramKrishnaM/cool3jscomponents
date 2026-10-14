import type { ContributionData, ContributionDay, ContributionLevel } from "../data";

export interface FetchContributionsOptions {
  token?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const MIN_DAYS = 300;
const GRAPHQL_URL = "https://api.github.com/graphql";
const LEVELS: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};
const CALENDAR_QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

export function isValidUsername(username: string): boolean {
  return USERNAME.test(username);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseContributionsPage(html: string, user: string): ContributionData {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/for="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = m[2].match(/^(\d[\d,]*) contribution/);
    counts.set(m[1], n ? Number(n[1].replace(/,/g, "")) : 0);
  }
  const days: ContributionDay[] = [];
  for (const m of html.matchAll(/<td[^>]*class="ContributionCalendar-day"[^>]*>/g)) {
    const tag = m[0];
    const date = tag.match(/data-date="([^"]+)"/)?.[1];
    const level = Number(tag.match(/data-level="(\d)"/)?.[1] ?? 0);
    const id = tag.match(/id="([^"]+)"/)?.[1];
    if (date) days.push({ date, level: Math.min(4, Math.max(0, level)) as ContributionLevel, count: (id && counts.get(id)) || 0 });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  const total = Number(html.match(/([\d,]+)\s+contributions?\s+in the last year/)?.[1].replace(/,/g, "") ?? 0);
  return { user, total, fetchedAt: today(), days };
}

async function fetchPublic(user: string, options: FetchContributionsOptions): Promise<ContributionData> {
  const request = options.fetch ?? fetch;
  const res = await request(`https://github.com/users/${encodeURIComponent(user)}/contributions`, {
    headers: { "User-Agent": "Mozilla/5.0 (contribution-skyline)" },
    signal: options.signal,
  });
  if (res.status === 404) throw new Error(`GitHub user "${user}" not found`);
  if (!res.ok) throw new Error(`GitHub responded with HTTP ${res.status}`);
  const data = parseContributionsPage(await res.text(), user);
  if (data.days.length < MIN_DAYS) throw new Error(`Only ${data.days.length} days parsed; GitHub's page may have changed`);
  return data;
}

interface CalendarResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
}

async function fetchWithToken(user: string, token: string, options: FetchContributionsOptions): Promise<ContributionData> {
  const request = options.fetch ?? fetch;
  const res = await request(GRAPHQL_URL, {
    method: "POST",
    headers: { "Authorization": `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "contribution-skyline" },
    body: JSON.stringify({ query: CALENDAR_QUERY, variables: { login: user } }),
    signal: options.signal,
  });
  if (!res.ok) throw new Error(`GitHub GraphQL responded with HTTP ${res.status}`);
  const body = (await res.json()) as CalendarResponse;
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  const calendar = body.data?.user?.contributionsCollection.contributionCalendar;
  if (!calendar) throw new Error(`GitHub user "${user}" not found`);
  const days: ContributionDay[] = calendar.weeks.flatMap((week) =>
    week.contributionDays.map((day) => ({ date: day.date, level: LEVELS[day.contributionLevel] ?? 0, count: day.contributionCount })),
  );
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { user, total: calendar.totalContributions, fetchedAt: today(), days };
}

export async function fetchContributions(username: string, options: FetchContributionsOptions = {}): Promise<ContributionData> {
  if (options.token && typeof window !== "undefined" && typeof document !== "undefined") {
    throw new Error("fetchContributions was given a GitHub token in a browser. Run it on a server, in a serverless function or at build time instead.");
  }
  const user = username.trim();
  if (!isValidUsername(user)) throw new Error(`"${username}" is not a valid GitHub username`);
  return options.token ? fetchWithToken(user, options.token, options) : fetchPublic(user, options);
}

export interface ContributionsHandlerOptions {
  token?: string;
  user?: string;
  cacheSeconds?: number;
  fetch?: typeof fetch;
}

export function createContributionsHandler(options: ContributionsHandlerOptions = {}): (request: Request) => Promise<Response> {
  const cacheSeconds = options.cacheSeconds ?? 3600;
  return async (request) => {
    const user = options.user ?? new URL(request.url).searchParams.get("user") ?? "";
    if (!isValidUsername(user)) return Response.json({ error: "Pass a valid GitHub username as ?user=" }, { status: 400 });
    try {
      const data = await fetchContributions(user, { token: options.token, fetch: options.fetch });
      return Response.json(data, {
        headers: { "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 24}` },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes("not found") ? 404 : 502;
      return Response.json({ error: message }, { status });
    }
  };
}
