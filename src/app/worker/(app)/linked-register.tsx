"use client";

import * as React from "react";

import { useLinkedRegister } from "@/features/worker/register-device";

/**
 * The caja block of the Worker header: the caja this computer IS (from its
 * device session, Worker FRD §2.1) and, underneath, its sede. The caja is not
 * an attribute of the Worker's account — whoever signs in at this computer
 * operates this caja.
 */
export function LinkedRegister({ fallback }: { fallback: string }): React.JSX.Element {
  const linked = useLinkedRegister();

  return (
    <div className="flex flex-col leading-tight">
      <span className="text-label font-semibold text-white">{linked?.register.name ?? fallback}</span>
      <span className="text-caption text-text-on-primary-muted">{linked?.branch.name ?? "Caja"}</span>
    </div>
  );
}
