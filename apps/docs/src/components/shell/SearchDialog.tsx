import { useEffect, useMemo, useState } from "react";
import { FileText, Home, Moon, Search } from "lucide-react";
import { GithubMark } from "@/components/shell/GithubMark";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { GITHUB_URL, type SearchEntry } from "@/lib/site";
import { applyTheme, currentTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function rank(_value: string, search: string, keywords: string[] = []) {
  const query = search.trim().toLowerCase();
  if (!query) return 1;
  const title = (keywords[0] ?? "").toLowerCase();
  const words = query.split(/\s+/);
  if (title.startsWith(query)) return 1;
  if (title.includes(query)) return 0.9;
  if (words.every((word) => title.includes(word))) return 0.8;
  const haystack = keywords.join(" ").toLowerCase();
  return words.every((word) => haystack.includes(word)) ? 0.4 : 0;
}

export function SearchDialog({ entries, className }: { entries: SearchEntry[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const [shortcut, setShortcut] = useState("Ctrl K");

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setShortcut("⌘K");
    const onKeyDown = (event: KeyboardEvent) => {
      const combo = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      const slash = event.key === "/" && !isTypingTarget(event.target);
      if (!combo && !slash) return;
      event.preventDefault();
      setOpen((value) => (combo ? !value : true));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = useMemo(() => {
    const byGroup = new Map<string, SearchEntry[]>();
    for (const entry of entries) {
      const list = byGroup.get(entry.group) ?? [];
      list.push(entry);
      byGroup.set(entry.group, list);
    }
    return [...byGroup];
  }, [entries]);

  const go = (href: string) => {
    setOpen(false);
    window.location.assign(href);
  };

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search docs"
        className={cn(
          "group inline-flex h-9 items-center gap-2 rounded-lg border bg-secondary/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          className,
        )}
      >
        <Search className="size-4" />
        <span className="hidden flex-1 text-left sm:inline">Search docs…</span>
        <kbd className="pointer-events-none hidden rounded border bg-background px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground sm:inline">
          {shortcut}
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[15dvh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">Search pages and actions</DialogDescription>
          <Command filter={rank} className="[&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase [&_[cmdk-item]]:py-2.5 **:data-[slot=command-input-wrapper]:h-12">
            <CommandInput placeholder="Search pages, options, guides…" />
            <CommandList className="max-h-[min(420px,60dvh)]">
              <CommandEmpty>Nothing found.</CommandEmpty>
              <CommandGroup heading="Pages">
                <CommandItem value="home" keywords={["Home", "landing"]} onSelect={() => go("/")}>
                  <Home /> Home
                </CommandItem>
              </CommandGroup>
              {groups.map(([group, items]) => (
                <CommandGroup key={group} heading={group}>
                  {items.map((entry) => (
                    <CommandItem
                      key={entry.href}
                      value={entry.href}
                      keywords={[entry.title, group, entry.description ?? ""]}
                      onSelect={() => go(entry.href)}
                    >
                      <FileText />
                      <span className="truncate">{entry.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem value="toggle-theme" keywords={["Toggle theme", "light dark mode"]} onSelect={() => run(() => applyTheme(currentTheme() === "dark" ? "light" : "dark"))}>
                  <Moon /> Toggle theme
                </CommandItem>
                <CommandItem value="github" keywords={["Open GitHub", "source repository"]} onSelect={() => run(() => window.open(GITHUB_URL, "_blank", "noopener"))}>
                  <GithubMark /> Open GitHub
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
