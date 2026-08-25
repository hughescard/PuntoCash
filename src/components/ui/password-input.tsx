"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, type InputProps } from "./input";

/**
 * Password field with a show/hide toggle.
 *
 * Built on `Input` so it inherits the §15 specification (48px, white, gris
 * claro border, 8px radius, navy focus border). The toggle is a real button:
 * keyboard reachable, labelled, and reporting its state through `aria-pressed`
 * so it is never communicated by icon alone (§20).
 *
 * `type` and `suffix` are owned by this component.
 */
export interface PasswordInputProps extends Omit<InputProps, "type" | "suffix" | "numeric"> {
  /** Accessible label for the toggle when the password is hidden. */
  showLabel?: string;
  /** Accessible label for the toggle when the password is visible. */
  hideLabel?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      className,
      showLabel = "Mostrar contraseña",
      hideLabel = "Ocultar contraseña",
      disabled,
      ...props
    },
    ref,
  ) {
    const [visible, setVisible] = React.useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={className}
        suffix={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            aria-label={visible ? hideLabel : showLabel}
            aria-pressed={visible}
            className={cn(
              // 44px target (§20), pulled toward the edge so the icon still
              // sits on the field's 16px padding line.
              "-mr-2 grid size-11 shrink-0 place-items-center rounded-control",
              "text-text-secondary transition-colors duration-(--duration-fast) ease-(--ease-standard)",
              "hover:bg-primary-subtle hover:text-text-primary",
              "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {visible ? (
              <EyeOff className="size-[18px]" aria-hidden="true" />
            ) : (
              <Eye className="size-[18px]" aria-hidden="true" />
            )}
          </button>
        }
        {...props}
      />
    );
  },
);

export { PasswordInput };
