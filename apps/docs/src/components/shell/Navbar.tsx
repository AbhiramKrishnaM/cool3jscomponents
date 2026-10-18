import { Button } from "@/components/ui/button";
import { GithubMark } from "@/components/shell/GithubMark";
import { Logo } from "@/components/shell/Logo";
import { SearchDialog } from "@/components/shell/SearchDialog";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { GITHUB_URL, NAV_LINKS, SITE_NAME, type SearchEntry } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Navbar({ entries, pathname }: { entries: SearchEntry[]; pathname: string }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <Logo className="size-7 rounded-[7px] ring-1 ring-border dark:ring-white/15" />
          <span className="hidden sm:inline md:hidden lg:inline">{SITE_NAME}</span>
        </a>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = (link.match ?? [link.href]).some((prefix) => pathname.startsWith(prefix));
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <SearchDialog entries={entries} className="sm:w-56" />
          <Button variant="ghost" size="icon" asChild>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
              <GithubMark />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
