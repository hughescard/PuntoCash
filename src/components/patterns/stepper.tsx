import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Progress across a multi-step operation.
 *
 * Current step carries the controlled gold accent (§3 "dorado: selección"),
 * completed steps a success check, future steps stay neutral. State is never
 * colour-only: the current step is marked `aria-current` and each completed
 * step names itself as completed to assistive technology (§20).
 */
export interface StepperStep {
  id: string;
  label: string;
}

export function Stepper({
  steps,
  currentIndex,
  className,
}: {
  steps: readonly StepperStep[];
  /** Zero-based; every earlier step counts as completed. */
  currentIndex: number;
  className?: string;
}): React.JSX.Element {
  return (
    <ol className={cn("flex items-center", className)}>
      {steps.map((step, index) => {
        const completed = index < currentIndex;
        const current = index === currentIndex;

        return (
          <React.Fragment key={step.id}>
            <li
              className="flex shrink-0 items-center gap-2.5"
              aria-current={current ? "step" : undefined}
            >
              {completed ? (
                <span
                  className="grid size-7 place-items-center rounded-pill border-2 border-success text-success"
                  aria-hidden="true"
                >
                  <Check className="size-4" strokeWidth={3} />
                </span>
              ) : null}

              <span
                aria-hidden="true"
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-pill text-caption font-semibold",
                  current && "bg-gold text-navy",
                  completed && "bg-surface-subtle text-text-secondary",
                  !current && !completed && "bg-surface-subtle text-text-secondary",
                )}
              >
                {index + 1}
              </span>

              <span
                className={cn(
                  "whitespace-nowrap text-label",
                  current ? "font-semibold text-text-primary" : "text-text-secondary",
                )}
              >
                {step.label}
              </span>

              {/* Carries the state for screen readers, which cannot see colour. */}
              <span className="sr-only">
                {completed ? " (completado)" : current ? " (paso actual)" : " (pendiente)"}
              </span>
            </li>

            {index < steps.length - 1 ? (
              <li aria-hidden="true" className="mx-4 h-px min-w-8 flex-1 bg-border" />
            ) : null}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
