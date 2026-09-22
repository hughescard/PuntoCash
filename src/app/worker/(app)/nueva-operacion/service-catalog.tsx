"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Search, SearchX, TicketCheck, X } from "lucide-react";

import { Button, Input } from "@/components/ui";
import { PageHeader } from "@/components/shell/app-shell";
import { ServiceCard } from "@/components/patterns/service-card";
import {
  SERVICE_CATEGORIES,
  WORKER_SERVICES,
  serviceMatchesQuery,
} from "@/features/operations/services";

/**
 * Service selector with client-side search.
 *
 * The screen asks one question — which service is the worker starting — so
 * there is no other state here and no store: a single query string filters the
 * catalog. Non-matching services are removed from the DOM rather than hidden
 * with CSS, so they leave the tab order too (§20).
 */
export function ServiceCatalog(): React.JSX.Element {
  const [query, setQuery] = React.useState("");
  const searchId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);

  /** Categories keep their grouping; empty ones disappear entirely (§8). */
  const groups = React.useMemo(
    () =>
      SERVICE_CATEGORIES.map((category) => ({
        category,
        services: WORKER_SERVICES.filter(
          (service) => service.category === category.id && serviceMatchesQuery(service, query),
        ),
      })).filter((group) => group.services.length > 0),
    [query],
  );

  const searching = query.trim().length > 0;
  const noResults = groups.length === 0;

  function clearSearch() {
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <>
      <PageHeader
        title="Nueva operación"
        description="Selecciona el servicio que deseas realizar."
        actions={
          <div className="w-80">
            {/* Visually hidden rather than absent: the magnifier is decorative,
                so the field still needs a real label (§20). */}
            <label htmlFor={searchId} className="sr-only">
              Buscar servicio
            </label>
            <Input
              ref={inputRef}
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar servicio"
              autoComplete="off"
              prefix={<Search className="size-[18px]" aria-hidden="true" />}
              suffix={
                searching ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Limpiar búsqueda"
                    className="-mr-2 grid size-11 shrink-0 place-items-center rounded-control text-text-secondary transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-primary-subtle hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <X className="size-[18px]" aria-hidden="true" />
                  </button>
                ) : undefined
              }
            />
          </div>
        }
      />

      {/* Announces result changes without stealing focus from the field. */}
      <p aria-live="polite" className="sr-only">
        {searching
          ? `${groups.reduce((total, group) => total + group.services.length, 0)} servicios encontrados`
          : ""}
      </p>

      {/* Kiosk handoff: the fastest path when the client already prepared the
          operation at the self-service kiosk. Hidden while searching so it
          never reads as a search result. */}
      {!searching ? (
        <Link
          href="/worker/nueva-operacion/solicitud"
          className="mb-8 flex items-center gap-4 rounded-card border border-gold bg-accent-subtle p-5 transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-primary-subtle outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-control bg-surface text-primary"
          >
            <TicketCheck className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-card-title font-semibold text-text-primary">
              ¿El cliente trae un código de kiosco?
            </span>
            <span className="mt-0.5 block text-body-sm text-text-secondary">
              Busca la solicitud y continúa con los datos que el cliente ya registró.
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-label font-semibold text-primary">
            Buscar solicitud
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </Link>
      ) : null}

      {noResults ? (
        <EmptyState onClear={clearSearch} />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(({ category, services }) => (
            <section key={category.id} aria-labelledby={`${category.id}-heading`}>
              <h2
                id={`${category.id}-heading`}
                className="mb-4 text-section-title text-text-primary"
              >
                {category.label}
              </h2>

              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 wide:grid-cols-4">
                {services.map((service) => (
                  <li key={service.id} className="flex">
                    <ServiceCard service={service} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-card border border-border bg-surface px-8 py-16 text-center">
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary"
      >
        <SearchX className="size-6" />
      </span>
      <p className="mt-4 text-section-title text-text-primary">No encontramos servicios</p>
      <p className="mt-2 text-body text-text-secondary">Prueba con otro término de búsqueda.</p>
      {/* Distinct from the field's inline "Limpiar búsqueda": two controls
          sharing one accessible name is ambiguous, and from an empty result
          the useful action is getting the whole catalog back. */}
      <Button variant="secondary" className="mt-6" onClick={onClear}>
        Mostrar todos los servicios
      </Button>
    </div>
  );
}
