"use client";

import * as React from "react";
import { ChevronRight, MapPin, Search } from "lucide-react";

import { searchBranches, type Branch } from "@/features/branches/branches";
import { SlideHeading } from "./slides/slide-tasas";

/**
 * First-start setup of a signage screen (Pantalla FRD §1.1 "Selección de
 * sede"): every sede of the network, a search box that filters as you type,
 * and one tap/click/Enter to choose. There is no link or admin approval —
 * the screen shows public information only, so choosing is all it takes.
 *
 * One of the two interactive views under `/kiosk/pantalla` (see
 * `ARCHITECTURE.md`; the other is the change-sede confirmation). It appears
 * only while the screen has no sede, and is built to be driven from a TV
 * remote as well as a keyboard or mouse: the arrow keys move between the
 * search box and the options, Enter chooses.
 *
 * Sized in `em` of the signage base font, like everything else here.
 */
export function BranchPicker({ onSelect }: { onSelect: (branch: Branch) => void }): React.JSX.Element {
  const [query, setQuery] = React.useState("");
  const results = searchBranches(query);
  const listRef = React.useRef<HTMLUListElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function options(): HTMLButtonElement[] {
    return Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-branch]") ?? []);
  }

  /** Remote-friendly movement: ↓/↑ through the list, ↑ from the first back to the search box. */
  function onListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = options();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    event.preventDefault();
    if (event.key === "ArrowDown") items[Math.min(index + 1, items.length - 1)]?.focus();
    else if (index === 0) inputRef.current?.focus();
    else items[index - 1]?.focus();
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      options()[0]?.focus();
    } else if (event.key === "Enter" && results.length === 1) {
      // One match left: Enter on the search box chooses it.
      event.preventDefault();
      onSelect(results[0]!);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SlideHeading eyebrow="Configuración de la pantalla" title="¿En qué sede está esta pantalla?" />
      <p className="mt-[0.8em] shrink-0 text-[1.1em] leading-snug text-text-on-primary-muted">
        Elige la sede para mostrar su información. Solo se pide la primera vez; para cambiarla después,
        pulsa Atrás en el mando o Esc en el teclado.
      </p>

      <label className="mt-[1.4em] flex h-[3.2em] shrink-0 items-center gap-[0.8em] rounded-control border-2 border-white/20 bg-white px-[1em] text-navy focus-within:border-gold">
        <Search className="size-[1.3em] shrink-0 text-gray" aria-hidden="true" />
        <span className="sr-only">Buscar sede</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder="Buscar por nombre, dirección o ciudad"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-[1.2em] text-anthracite outline-none placeholder:text-gray"
        />
      </label>

      <p className="mt-[1em] shrink-0 text-[0.9em] text-text-on-primary-muted" aria-live="polite">
        {results.length === 1 ? "1 sede" : `${results.length} sedes`}
      </p>

      {results.length === 0 ? (
        <div className="mt-[0.6em] flex min-h-0 flex-1 items-start">
          <p className="rounded-card border border-white/10 bg-white/[0.04] px-[1.5em] py-[1.2em] text-[1.1em] text-white">
            Ninguna sede coincide con «{query.trim()}». Revisa lo que escribiste o borra la búsqueda.
          </p>
        </div>
      ) : (
        <ul
          ref={listRef}
          onKeyDown={onListKeyDown}
          className="pc-scroll-y mt-[0.4em] flex min-h-0 flex-1 flex-col gap-[0.7em] p-[0.25em] [&>li]:shrink-0"
        >
          {results.map((branch) => (
            <li key={branch.id}>
              <button
                type="button"
                data-branch={branch.id}
                onClick={() => onSelect(branch)}
                className="group flex w-full items-center gap-[1em] rounded-card border border-white/10 bg-white/[0.04] px-[1.3em] py-[1em] text-left transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-white/25 hover:bg-white/[0.08] outline-none focus-visible:border-gold focus-visible:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span
                  aria-hidden="true"
                  className="grid size-[2.6em] shrink-0 place-items-center rounded-pill bg-gold/15 text-gold"
                >
                  <MapPin className="size-[1.3em]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[1.25em] font-bold leading-tight text-white">{branch.name}</span>
                  <span className="mt-[0.2em] truncate text-[0.95em] leading-snug text-text-on-primary-muted">
                    {branch.address} · {branch.locality}
                  </span>
                </span>
                <ChevronRight
                  className="size-[1.3em] shrink-0 text-white/40 group-hover:text-gold group-focus-visible:text-gold"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
