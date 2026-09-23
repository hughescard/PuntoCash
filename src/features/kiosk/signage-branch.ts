import * as React from "react";

import { findBranchById, type Branch } from "@/features/branches/branches";

/**
 * Which sede a signage screen (`/kiosk/pantalla`) belongs to.
 *
 * Unlike the self-service kiosk, a signage screen is NOT linked by an admin:
 * it only ever displays public information, so it has no session at all.
 * The first time it starts it lists every sede of the network, whoever
 * installs it picks the right one, and from then on it shows that sede's
 * information. Pressing Atrás on the TV remote (or Esc on a keyboard), and
 * confirming, clears the choice and brings the picker back — for a screen
 * that moves to another sede, or one that was set up wrong (Pantalla FRD §1.1).
 *
 * The choice is stored ON THE DEVICE, which is exactly the property the
 * product needs: two TVs in two sedes keep two different answers.
 * `localStorage` is the demo's way of doing that; a native or managed-browser
 * build would use its own local settings store.
 */

const STORAGE_KEY = "puntocash.kiosk.pantalla.sede";

let memoryValue: string | null = null;
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryValue;
  }
}

function write(value: string | null): void {
  memoryValue = value;
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // The memory copy is still valid for this tab.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeNever(): () => void {
  return () => {};
}

/**
 * The sede this screen shows. `undefined` until hydrated (so the picker never
 * flashes on a screen that already has a sede), `null` when none is chosen —
 * or when the stored id no longer matches any sede of the network.
 */
export function useSignageBranch(): Branch | null | undefined {
  const id = React.useSyncExternalStore(subscribe, read, () => null);
  const hydrated = React.useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!hydrated) return undefined;
  return findBranchById(id);
}

export function setSignageBranch(branchId: string): void {
  write(branchId);
}

export function clearSignageBranch(): void {
  write(null);
}
