import { findBranchById, findRegisterById, type Branch, type Register } from "@/features/branches/branches";
import {
  createDeviceLink,
  type LinkInput,
  type LinkResult,
  type UnlinkedDevice,
} from "@/features/devices/device-link";

/**
 * The Worker caja's DEVICE SESSION (Worker FRD §2.1).
 *
 * The computer at a counter is linked ONCE, by the sede's admin, to one sede
 * and to one of its cajas — same mechanism as the self-service kiosk (see
 * `@/features/devices/device-link`). The link is remembered by the device:
 * Workers sign in and out on top of it, jornada after jornada, and none of
 * that touches it. Only the admin can undo it.
 *
 * Two sessions, two jobs:
 *   · device session  → "this computer is Caja 03 of PuntoCash Vedado"
 *   · Worker session  → "Juan Pérez is operating it", opened with password +
 *                       second factor every time [R13]. Linking the device
 *                       is NOT a "trusted device" for the second factor.
 */

const registerLink = createDeviceLink("caja");

export const useRegisterDevice = registerLink.useDevice;
export const ensureRegisterPairingChallenge = registerLink.ensurePairingChallenge;
export const unlinkRegisterDevice = registerLink.unlink;
export const currentRegisterDevice = registerLink.current;

export function registerPairingQrPayload(state: UnlinkedDevice): string {
  return registerLink.pairingQrPayload(state);
}

/** Exported for the demo's admin simulator only; a caja never links itself. */
export function linkRegisterDevice(input: LinkInput, now?: Date): LinkResult {
  return registerLink.link(input, now);
}

export interface LinkedRegister {
  branch: Branch;
  register: Register;
}

/** Sede and caja of this computer, or `null` while it is not linked. */
export function useLinkedRegister(): LinkedRegister | null {
  const device = useRegisterDevice();
  return resolve(device?.status === "linked" ? device : null);
}

/** Same, read outside React — used by the sign-in to check the Worker's sede. */
export function currentLinkedRegister(): LinkedRegister | null {
  const device = currentRegisterDevice();
  return resolve(device?.status === "linked" ? device : null);
}

function resolve(device: { branchId: string; registerId?: string } | null): LinkedRegister | null {
  if (!device) return null;
  const branch = findBranchById(device.branchId);
  const register = findRegisterById(device.registerId);
  return branch && register ? { branch, register } : null;
}
