import * as React from "react";

import { RegisterDeviceGate } from "./_device/register-device-gate";

/**
 * Every Worker route runs on a computer linked to one caja of one sede
 * (Worker FRD §2.1). The gate shows the pairing screen until that link
 * exists; the `(auth)` and `(app)` groups below only render once it does.
 */
export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <RegisterDeviceGate>{children}</RegisterDeviceGate>;
}
