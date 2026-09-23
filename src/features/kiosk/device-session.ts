import { findBranchById, type Branch } from "@/features/branches/branches";
import {
  createDeviceLink,
  type DeviceState,
  type LinkInput,
  type LinkResult,
  type UnlinkedDevice,
} from "@/features/devices/device-link";

/**
 * The self-service kiosk's DEVICE SESSION (Autoservicio FRD §1.1).
 *
 * The kiosk is not session-less. The CLIENT who uses it never signs in, but
 * the DEVICE does: before it can prepare a single request, the sede's admin
 * links it to that sede — see `@/features/devices/device-link`, which the
 * kiosk shares with the Worker cajas. From then on everything it shows or
 * produces belongs to that sede.
 */

export {
  PAIRING_VALIDITY_MINUTES,
  formatPairingCode,
  type LinkMethod,
  type LinkResult,
  type PairingChallenge,
} from "@/features/devices/device-link";

export type KioskDeviceState = DeviceState;

const kioskLink = createDeviceLink("kiosco");

export const useKioskDevice = kioskLink.useDevice;
export const ensurePairingChallenge = kioskLink.ensurePairingChallenge;
export const unlinkKioskDevice = kioskLink.unlink;
export const currentKioskDevice = kioskLink.current;

export function pairingQrPayload(state: UnlinkedDevice): string {
  return kioskLink.pairingQrPayload(state);
}

/** Exported for the demo's admin simulator only; the kiosk never links itself. */
export function linkKioskDevice(input: LinkInput, now?: Date): LinkResult {
  return kioskLink.link(input, now);
}

/** The sede a linked kiosk belongs to, or `null` when it is not linked. */
export function useKioskBranch(): Branch | null {
  const device = useKioskDevice();
  return device?.status === "linked" ? findBranchById(device.branchId) : null;
}
