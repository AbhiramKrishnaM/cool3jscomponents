import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fetchContributions } from "./index";

const USAGE = "Usage: contribution-skyline-fetch <username> [--out contributions.json]\nSet CONTRIBUTIONS_TOKEN to use the GitHub GraphQL API instead of the public page.";

function parseArgs(argv: string[]): { user: string | undefined; out: string } {
  let user: string | undefined;
  let out = "contributions.json";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out" || arg === "-o") out = argv[++i] ?? out;
    else if (arg.startsWith("--out=")) out = arg.slice("--out=".length);
    else if (!arg.startsWith("-")) user = arg;
  }
  return { user, out: resolve(out) };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return;
  }
  const { user, out } = parseArgs(args);
  if (!user) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  try {
    const data = await fetchContributions(user, { token: process.env.CONTRIBUTIONS_TOKEN || undefined });
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(data)}\n`);
    console.log(`contributions: ${data.total} in the last year, ${data.days.length} days → ${out}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!(await exists(out))) {
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, `${JSON.stringify({ user, total: 0, fetchedAt: null, days: [] })}\n`);
    }
    console.warn(`contributions: fetch failed (${message}), keeping existing data`);
  }
}

void main();
