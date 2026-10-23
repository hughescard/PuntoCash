import * as React from "react";
import { Clock, MapPin, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Branch } from "@/features/branches/branches";
import { useFicha } from "../tableros";
import { SlideHeading } from "./slide-tasas";

/**
 * "Info de la sucursal" — where we are, when we are open, how to reach us —
 * for the sede this screen was set up for (Pantalla FRD FR-PANT-SUC-1).
 * Three columns on a landscape TV, stacked on a vertical screen.
 *
 * Address, phone and hours come from the server (`useFicha`), not from the
 * `branch` this screen stored when it was set up: the sede's admin edits them
 * (FR-AD-SEDE-14) and the stored copy would never learn. The stored one is
 * only the fallback while the server has not answered.
 */
export function SlideSucursal({ branch }: { branch: Branch }): React.JSX.Element {
  const ficha = useFicha(branch.id);
  const address = ficha ? `${ficha.address}, ${ficha.locality}` : `${branch.address}, ${branch.locality}`;
  const hours = ficha ? ficha.horario : branch.hours.split("; ");
  const phone = ficha?.phone ?? branch.phone;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SlideHeading eyebrow={branch.name} title="Estamos aquí para ayudarte" />

      <div className="mt-[1.5em] grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-[1.25em] landscape:grid-cols-3">
        <InfoTile icon={MapPin} label="Dirección" value={address} />
        <InfoTile icon={Clock} label="Horario" value={hours} />
        <InfoTile icon={Phone} label="Teléfono" value={phone} numeric />
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
  /** Varias líneas (el horario por grupos de días) van una debajo de otra. */
  value: string | readonly string[];
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
        {(typeof value === "string" ? [value] : value).map((linea) => (
          <p
            key={linea}
            className={cn("mt-[0.3em] text-[1.45em] font-semibold leading-snug text-white", numeric && "pc-numeric")}
          >
            {linea}
          </p>
        ))}
      </div>
    </div>
  );
}
