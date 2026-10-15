import { useState } from "react";
import { Moon, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DesignCheck() {
  const [clicks, setClicks] = useState(0);
  const [dark, setDark] = useState(true);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => setClicks((n) => n + 1)} data-testid="island">
        <Sparkles /> Clicked {clicks}
      </Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="outline" size="icon" aria-label="Toggle theme" onClick={toggleTheme} data-testid="theme">
        {dark ? <Sun /> : <Moon />}
      </Button>
    </div>
  );
}
