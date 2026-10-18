import { useId, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ControlSchema, Values } from "@/registry";

type ChangeHandler = (entry: ControlSchema, value: unknown) => void;

function decimals(step: number | undefined): number {
  if (!step || step >= 1) return 0;
  return Math.min(4, Math.ceil(-Math.log10(step)));
}

function clamp(value: number, entry: ControlSchema): number {
  return Math.min(entry.max ?? Infinity, Math.max(entry.min ?? -Infinity, value));
}

const field = "h-7 rounded-md border bg-background px-2 font-mono text-xs tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

function NumberControl({ entry, value, onChange }: { entry: ControlSchema; value: number; onChange: ChangeHandler }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value.toFixed(decimals(entry.step));

  const commit = (): void => {
    if (draft === null) return;
    const parsed = Number(draft);
    setDraft(null);
    if (draft.trim() !== "" && Number.isFinite(parsed)) onChange(entry, clamp(parsed, entry));
  };

  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-muted-foreground" title={entry.description}>{entry.label}</label>
        <input
          id={id}
          inputMode="decimal"
          className={cn(field, "w-16 text-right")}
          value={shown}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setDraft(null);
          }}
        />
      </div>
      <Slider
        aria-label={entry.label}
        min={entry.min}
        max={entry.max}
        step={entry.step}
        value={[value]}
        onValueChange={([next]) => onChange(entry, next)}
      />
    </div>
  );
}

function BooleanControl({ entry, value, onChange }: { entry: ControlSchema; value: boolean; onChange: ChangeHandler }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm text-muted-foreground" title={entry.description}>{entry.label}</label>
      <Switch id={id} checked={value} onCheckedChange={(checked) => onChange(entry, checked)} />
    </div>
  );
}

function ColorControl({ entry, value, onChange }: { entry: ControlSchema; value: string; onChange: ChangeHandler }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (): void => {
    if (draft === null) return;
    const hex = draft.trim().startsWith("#") ? draft.trim() : `#${draft.trim()}`;
    setDraft(null);
    if (/^#[0-9a-f]{6}$/i.test(hex)) onChange(entry, hex.toLowerCase());
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm text-muted-foreground" title={entry.description}>{entry.label}</label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          className={cn(field, "w-20")}
          value={draft ?? value}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setDraft(null);
          }}
        />
        <span className="relative size-7 shrink-0 overflow-hidden rounded-md border" style={{ background: value }}>
          <input
            type="color"
            aria-label={`${entry.label} picker`}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            value={value}
            onChange={(event) => onChange(entry, event.target.value)}
          />
        </span>
      </div>
    </div>
  );
}

function SelectControl({ entry, value, onChange }: { entry: ControlSchema; value: string; onChange: ChangeHandler }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm text-muted-foreground" title={entry.description}>{entry.label}</span>
      <div role="radiogroup" aria-label={entry.label} className="flex rounded-md border bg-background p-0.5">
        {(entry.choices ?? []).map((choice) => (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={choice === value}
            className="flex-1 rounded-[5px] px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-checked:bg-secondary aria-checked:text-foreground"
            onClick={() => onChange(entry, choice)}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}

function Control({ entry, values, onChange }: { entry: ControlSchema; values: Values; onChange: ChangeHandler }) {
  const value = values[entry.key];
  if (entry.type === "number") return <NumberControl entry={entry} value={value as number} onChange={onChange} />;
  if (entry.type === "boolean") return <BooleanControl entry={entry} value={value as boolean} onChange={onChange} />;
  if (entry.type === "color") return <ColorControl entry={entry} value={value as string} onChange={onChange} />;
  return <SelectControl entry={entry} value={value as string} onChange={onChange} />;
}

export function Controls({ controls, values, onChange }: { controls: readonly ControlSchema[]; values: Values; onChange: ChangeHandler }) {
  const groups = [...new Set(controls.map((entry) => entry.group))].map((group) => ({
    group,
    entries: controls.filter((entry) => entry.group === group),
  }));

  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(({ group, entries }) => (
        <fieldset key={group} className="grid min-w-0 content-start gap-4">
          <legend className="mb-4 font-mono text-[11px] tracking-wider text-muted-foreground/80 uppercase">{group}</legend>
          {entries.map((entry) => <Control key={entry.key} entry={entry} values={values} onChange={onChange} />)}
        </fieldset>
      ))}
    </div>
  );
}
