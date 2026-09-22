import * as React from "react";
import { Clock, MapPin, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import { BRANCH_INFO } from "@/features/kiosk/signage-data";
import { SlideHeading } from "./slide-tasas";

/**
 * "Info de la sucursal" — where we are, when we are open, how to reach us.
 * Three columns on a landscape TV, stacked on a vertical screen.
 */
export function SlideSucursal(): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SlideHeading eyebrow={BRANCH_INFO.name} title="Estamos aquí para ayudarte" />

      <div className="mt-[1.5em] grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-[1.25em] landscape:grid-cols-3">
        <InfoTile icon={MapPin} label="Dirección" value={BRANCH_INFO.address} />
        <InfoTile icon={Clock} label="Horario" value={BRANCH_INFO.hours} />
        <InfoTile icon={Phone} label="Teléfono" value={BRANCH_INFO.phone} numeric />
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  numeric = false,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-col justify-center gap-[1em] overflow-hidden rounded-card border border-white/10 bg-white/[0.04] p-[1.75em] portrait:flex-row portrait:items-center portrait:justify-start portrait:gap-[1.5em]">
      <span
        aria-hidden="true"
        className="grid size-[3.25em] shrink-0 place-items-center rounded-pill bg-gold/15 text-gold"
      >
        <Icon className="size-[1.6em]" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.85em] font-semibold uppercase leading-tight tracking-[0.08em] text-text-on-primary-muted">
          {label}
        </p>
        <p className={cn("mt-[0.3em] text-[1.45em] font-semibold leading-snug text-white", numeric && "pc-numeric")}>
          {value}
        </p>
      </div>
    </div>
  );
}
