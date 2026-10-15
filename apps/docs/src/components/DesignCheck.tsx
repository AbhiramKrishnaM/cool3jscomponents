import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DesignCheck() {
  const [clicks, setClicks] = useState(0);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => setClicks((n) => n + 1)} data-testid="island">
        <Sparkles /> Clicked {clicks}
      </Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  );
}
