import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Form field scaffolding — manual §15 and §20.
 *
 *   · "Labels persistentes en formularios; placeholders no sustituyen labels."
 *   · "Mensajes de error específicos y asociados al campo correspondiente."
 *
 * This module is deliberately free of hooks, context and client-only imports,
 * so a Server Component can lay out an entire form. Only the controls placed
 * inside a `Field` (Input, Select) cross into the client, and only because they
 * are interactive.
 *
 * The accessible wiring is explicit rather than implicit: a `FieldSpec` object
 * is the single source of truth, spread onto `Field` for the visible parts and
 * passed through `fieldAria()` for the attributes the control must carry.
 *
 *   const amount = { id: "amount", label: "Importe", error } satisfies FieldSpec;
 *
 *   <Field {...amount}>
 *     <Input {...fieldAria(amount)} numeric prefix="EUR" />
 *   </Field>
 *
 * Composite controls wire the same object onto whichever element is the real
 * focus target — for a Radix Select that is the trigger, not the root:
 *
 *   <Field {...currency}>
 *     <Select>
 *       <SelectTrigger {...fieldAria(currency)}>…</SelectTrigger>
 *     </Select>
 *   </Field>
 */

/** The description and label of one form control. `id` must be unique per page. */
export interface FieldSpec {
  id: string;
  label: React.ReactNode;
  /** Helper text shown under the control when there is no error. */
  description?: React.ReactNode;
  /** Specific, field-level error message (§20). */
  error?: React.ReactNode;
  required?: boolean;
}

/** Attributes `fieldAria()` produces for the control element. */
export interface FieldControlAria {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
}

const descriptionIdFor = (id: string): string => `${id}-description`;
const errorIdFor = (id: string): string => `${id}-error`;

/**
 * Attributes the control must carry so the label, description and error are
 * announced with it. Pass the same object given to `Field`.
 *
 * `aria-describedby` only ever references an element that actually renders:
 * `Field` shows the error *instead of* the description, so pointing at both
 * would leave a dangling reference that screen readers silently drop.
 */
export function fieldAria(
  spec: Pick<FieldSpec, "id" | "description" | "error" | "required">,
): FieldControlAria {
  const { id, description, error, required } = spec;

  return {
    id,
    "aria-describedby": error
      ? errorIdFor(id)
      : description
        ? descriptionIdFor(id)
        : undefined,
    "aria-invalid": error ? true : undefined,
    "aria-required": required ? true : undefined,
  };
}

export interface FieldProps extends FieldSpec {
  className?: string;
  /** The control, composed by the caller. */
  children: React.ReactNode;
}

/**
 * Label + control + description/error layout. Renders no interactive markup of
 * its own, so it stays a Server Component.
 */
export function Field({
  id,
  label,
  description,
  error,
  required,
  className,
  children,
}: FieldProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>

      {children}

      {error ? (
        <p
          id={errorIdFor(id)}
          role="alert"
          className="flex items-start gap-1.5 text-caption text-error-foreground"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : description ? (
        <p id={descriptionIdFor(id)} className="text-caption text-text-secondary">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

/**
 * Persistent field label (§20). A native `<label>` — the previous Radix
 * `Label` only added double-click text-selection suppression, at the cost of
 * pulling every form into the client bundle.
 */
export function Label({
  className,
  children,
  required,
  ...props
}: LabelProps): React.JSX.Element {
  return (
    <label className={cn("text-label text-text-primary select-none", className)} {...props}>
      {children}
      {required ? (
        <span className="ml-1 text-error" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

/**
 * Read-only presentation of a value the user cannot change. The manual asks for
 * these to be shown as text rather than disabled inputs (§15).
 */
export function ReadOnlyValue({
  label,
  children,
  numeric = false,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  numeric?: boolean;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-caption text-text-secondary">{label}</span>
      <span className={cn("text-body font-medium text-text-primary", numeric && "pc-numeric")}>
        {children}
      </span>
    </div>
  );
}
