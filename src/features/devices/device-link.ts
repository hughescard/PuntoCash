import * as React from "react";

import { findBranchById } from "@/features/branches/branches";

/**
 * FRONTEND-ONLY MOCK of a DEVICE SESSION — shared by every PuntoCash terminal
 * that must belong to a sede before it can be used: the self-service kiosk
 * and each Worker cash register (caja).
 *
 * A device session is the terminal's, never a person's. It is created the way
 * a phone is added to WhatsApp or Telegram as a linked device:
 *
 *   1. First start: the terminal has no session. It shows a pairing screen
 *      with a QR and a six-digit code — the same challenge in two forms —
 *      valid for a few minutes and renewed automatically when it expires.
 *   2. The sede's admin (the merchant), from their web panel, either scans
 *      the QR or types the code, and chooses which sede the terminal belongs
 *      to — and, for a caja, which of that sede's cajas it is.
 *   3. The link is remembered by the terminal. Nothing a person does on it
 *      (a client finishing a request, a Worker signing out) undoes it.
 *   4. The admin can unlink it at any time; the terminal drops its session on
 *      the spot and goes back to the pairing screen.
 *
 * On a caja, the device session comes FIRST and the Worker's own session
 * sits on top of it: the device says "this is Caja 03 of PuntoCash Vedado",
 * the Worker's sign-in says "Juan Pérez is operating it for this jornada".
 * Only a person's session needs a second factor [R13].
 *
 * ── Demo mechanics ─────────────────────────────────────────────────────
 * The admin panel does not exist yet, so the demo ships a stand-in at
 * `/kiosk/simulador-admin`. State lives in `localStorage`, one key per kind
 * of terminal, so the terminal's tab and the simulator's tab see each other
 * (the `storage` event re-renders the terminal the instant the simulator
 * links or unlinks it). A real backend replaces all of this with a
 * server-issued device credential.
 */

export type DeviceKind = "kiosco" | "caja";

export type LinkMethod = "qr" | "codigo";

export interface PairingChallenge {
  /** Six digits, shown grouped as "482 913" and typed by the admin. */
  code: string;
  /** ISO timestamp. The terminal renews the challenge once it passes. */
  expiresAt: string;
}

export interface UnlinkedDevice {
  status: "unlinked";
  deviceId: string;
  pairing: PairingChallenge;
  /** Set when an admin unlinked this device, so the terminal can say so. */
  unlinkedFrom?: { branchId: string; registerId?: string; at: string };
}

export interface LinkedDevice {
  status: "linked";
  deviceId: string;
  branchId: string;
  /** Cajas only: which of the sede's cajas this terminal is. */
  registerId?: string;
  linkedAt: string;
  linkMethod: LinkMethod;
}

export type DeviceState = UnlinkedDevice | LinkedDevice;

export type LinkResult =
  | { ok: true; state: LinkedDevice }
  | {
      ok: false;
      reason: "no-device" | "already-linked" | "invalid-code" | "expired" | "unknown-branch" | "missing-register";
    };

export type LinkInput = { branchId: string; registerId?: string } & (
  | { method: "qr"; payload: string }
  | { method: "codigo"; code: string }
);

/** How long a pairing QR/code stays valid before the terminal renews it. */
export const PAIRING_VALIDITY_MINUTES = 10;

const DEVICE_ID_PREFIX: Record<DeviceKind, string> = { kiosco: "KIO", caja: "CAJ" };

/** "482913" → "482 913", the grouping shown on the terminal and typed by the admin. */
export function formatPairingCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

function randomDigits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += String(Math.floor(Math.random() * 10));
  return out;
}

function newPairing(now: Date): PairingChallenge {
  return {
    code: randomDigits(6),
    expiresAt: new Date(now.getTime() + PAIRING_VALIDITY_MINUTES * 60_000).toISOString(),
  };
}

function subscribeNever(): () => void {
  return () => {};
}

export interface DeviceLink {
  kind: DeviceKind;
  /** `undefined` until hydrated, `null` when the terminal was never started. */
  useDevice(): DeviceState | null | undefined;
  /** Read outside React. */
  current(): DeviceState | null;
  /** Creates the device on first start and renews an expired challenge. Never touches a linked device. */
  ensurePairingChallenge(now?: Date): void;
  /** Contents of the pairing QR. A real product encodes a signed, single-use token. */
  pairingQrPayload(state: UnlinkedDevice): string;
  /** What the admin panel does to link the terminal. The terminal never links itself. */
  link(input: LinkInput, now?: Date): LinkResult;
  /** What the admin panel does to unlink the terminal. */
  unlink(now?: Date): void;
}

/** One device-session store per kind of terminal. */
export function createDeviceLink(kind: DeviceKind): DeviceLink {
  const storageKey = kind === "kiosco" ? "puntocash.kiosk.device" : "puntocash.caja.device";
  let memoryRaw: string | null = null;
  const listeners = new Set<() => void>();

  function readRaw(): string | null {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return memoryRaw;
    }
  }

  function write(state: DeviceState): void {
    const raw = JSON.stringify(state);
    memoryRaw = raw;
    try {
      window.localStorage.setItem(storageKey, raw);
    } catch {
      // The memory copy is still valid for this tab.
    }
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  /* `getSnapshot` must return the same object while nothing changed, so the
     parsed state is cached against the raw string it came from. */
  let cachedRaw: string | null | undefined;
  let cachedState: DeviceState | null = null;

  function getSnapshot(): DeviceState | null {
    const raw = readRaw();
    if (raw === cachedRaw) return cachedState;
    cachedRaw = raw;
    try {
      cachedState = raw ? (JSON.parse(raw) as DeviceState) : null;
    } catch {
      cachedState = null;
    }
    return cachedState;
  }

  function pairingQrPayload(state: UnlinkedDevice): string {
    return `puntocash:${kind}-link:v1:${state.deviceId}:${state.pairing.code}`;
  }

  return {
    kind,

    useDevice() {
      const state = React.useSyncExternalStore(subscribe, getSnapshot, () => null);
      const hydrated = React.useSyncExternalStore(subscribeNever, () => true, () => false);
      return hydrated ? state : undefined;
    },

    current: getSnapshot,

    ensurePairingChallenge(now = new Date()) {
      const current = getSnapshot();
      if (!current) {
        write({
          status: "unlinked",
          deviceId: `${DEVICE_ID_PREFIX[kind]}-${randomDigits(4)}-${randomDigits(4)}`,
          pairing: newPairing(now),
        });
        return;
      }
      if (current.status === "unlinked" && new Date(current.pairing.expiresAt).getTime() <= now.getTime()) {
        write({ ...current, pairing: newPairing(now) });
      }
    },

    pairingQrPayload,

    link(input, now = new Date()) {
      const current = getSnapshot();
      if (!current) return { ok: false, reason: "no-device" };
      if (current.status === "linked") return { ok: false, reason: "already-linked" };
      if (!findBranchById(input.branchId)) return { ok: false, reason: "unknown-branch" };
      if (kind === "caja" && !input.registerId) return { ok: false, reason: "missing-register" };

      const matches =
        input.method === "qr"
          ? input.payload === pairingQrPayload(current)
          : input.code.replace(/\D/g, "") === current.pairing.code;
      if (!matches) return { ok: false, reason: "invalid-code" };
      if (new Date(current.pairing.expiresAt).getTime() <= now.getTime()) return { ok: false, reason: "expired" };

      const linked: LinkedDevice = {
        status: "linked",
        deviceId: current.deviceId,
        branchId: input.branchId,
        ...(kind === "caja" ? { registerId: input.registerId } : {}),
        linkedAt: now.toISOString(),
        linkMethod: input.method,
      };
      write(linked);
      return { ok: true, state: linked };
    },

    unlink(now = new Date()) {
      const current = getSnapshot();
      if (!current || current.status !== "linked") return;
      write({
        status: "unlinked",
        deviceId: current.deviceId,
        pairing: newPairing(now),
        unlinkedFrom: { branchId: current.branchId, registerId: current.registerId, at: now.toISOString() },
      });
    },
  };
}
