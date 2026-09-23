"use client";

import * as React from "react";
import { KeyRound, Link2, Link2Off, QrCode, ScanLine } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  ReadOnlyValue,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  fieldAria,
  type FieldSpec,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { BRANCHES, findBranchById, findRegisterById, registersOf } from "@/features/branches/branches";
import { CAJA_SUMMARY } from "@/features/caja/caja-data";
import {
  formatPairingCode,
  type DeviceState,
  type LinkInput,
  type LinkResult,
  type UnlinkedDevice,
} from "@/features/devices/device-link";
import {
  linkKioskDevice,
  pairingQrPayload,
  unlinkKioskDevice,
  useKioskDevice,
} from "@/features/kiosk/device-session";
import {
  linkRegisterDevice,
  registerPairingQrPayload,
  unlinkRegisterDevice,
  useRegisterDevice,
} from "@/features/worker/register-device";

type LinkError = Exclude<LinkResult, { ok: true }>["reason"];

const LINK_ERRORS: Record<LinkError, string> = {
  "no-device": "No hay ningún equipo esperando vinculación.",
  "already-linked": "Este equipo ya está vinculado.",
  "invalid-code": "El código no coincide con ningún equipo pendiente. Revisa el código que muestra el equipo.",
  expired: "Ese código caducó. El equipo ya muestra uno nuevo.",
  "unknown-branch": "Elige la sede a la que pertenece el equipo.",
  "missing-register": "Elige qué caja de la sede es este equipo.",
};

/**
 * DEMO-ONLY admin simulator — see `page.tsx`. Mirrors what the sede admin's
 * web panel must let them do with the sede's terminals:
 *
 *   · Kioscos de autoservicio (Autoservicio FRD FR-AS-LINK-4, FR-AS-LINK-6)
 *   · Cajas (Worker FRD FR-DEV-3, FR-DEV-7) — linking also names the caja.
 *
 * The demo has one terminal of each kind (the one open in this browser), so
 * each section manages that one. The real sections list every terminal of
 * the admin's sedes.
 */
export function KioskLinkSimulator(): React.JSX.Element {
  const kiosk = useKioskDevice();
  const caja = useRegisterDevice();

  return (
    <>
      <PageHeader
        title="Equipos de la sede"
        description="Vincula los kioscos de autoservicio y las cajas a una de tus sedes, o desvincúlalos."
      />

      <Alert variant="info" title="Esto es un simulador de demostración" className="mb-8">
        Hace lo que harán las secciones «Kioscos de autoservicio» y «Cajas» del panel web del administrador
        de sede, que todavía no existe. Ábrelo en una pestaña y el equipo (/kiosk/autoservicio o /worker) en
        otra, en el mismo navegador.
      </Alert>

      <Section title="Kioscos de autoservicio">
        <DeviceCard
          kind="kiosco"
          device={kiosk}
          qrPayload={pairingQrPayload}
          link={linkKioskDevice}
          unlink={unlinkKioskDevice}
          emptyHint="Abre /kiosk/autoservicio en otra pestaña: la primera vez que arranca, muestra su código de vinculación."
        />
      </Section>

      <Section title="Cajas">
        <DeviceCard
          kind="caja"
          device={caja}
          qrPayload={registerPairingQrPayload}
          link={linkRegisterDevice}
          unlink={unlinkRegisterDevice}
          emptyHint="Abre /worker/login en otra pestaña: la primera vez que arranca, el equipo muestra su código de vinculación antes del inicio de sesión."
        />
      </Section>
    </>
  );
}

function DeviceCard({
  kind,
  device,
  qrPayload,
  link,
  unlink,
  emptyHint,
}: {
  kind: "kiosco" | "caja";
  device: DeviceState | null | undefined;
  qrPayload: (device: UnlinkedDevice) => string;
  link: (input: LinkInput) => LinkResult;
  unlink: () => void;
  emptyHint: string;
}): React.JSX.Element | null {
  const isCaja = kind === "caja";
  const noun = isCaja ? "Equipo de caja" : "Kiosco";
  const [branchId, setBranchId] = React.useState("");
  const [registerId, setRegisterId] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<LinkError | null>(null);
  const [confirmUnlink, setConfirmUnlink] = React.useState(false);

  const branchField = {
    id: `${kind}-sede`,
    label: "Sede",
    description: "El admin solo ve las sedes que administra. En la demo aparecen todas.",
    error: error === "unknown-branch" ? LINK_ERRORS[error] : undefined,
  } satisfies FieldSpec;
  const registerField = {
    id: `${kind}-caja`,
    label: "Caja",
    description: "En la demo, solo la caja con datos simulados está disponible.",
    error: error === "missing-register" ? LINK_ERRORS[error] : undefined,
  } satisfies FieldSpec;
  const codeField = {
    id: `${kind}-codigo`,
    label: "Código que muestra el equipo",
    error:
      error && error !== "unknown-branch" && error !== "missing-register" ? LINK_ERRORS[error] : undefined,
  } satisfies FieldSpec;

  function handle(result: LinkResult) {
    if (result.ok) {
      setError(null);
      setCode("");
      return;
    }
    setError(result.reason);
  }

  function preconditions(): boolean {
    if (!branchId) {
      setError("unknown-branch");
      return false;
    }
    if (isCaja && !registerId) {
      setError("missing-register");
      return false;
    }
    return true;
  }

  function linkByCode(event: React.FormEvent) {
    event.preventDefault();
    if (!preconditions()) return;
    handle(link({ method: "codigo", code, branchId, registerId: isCaja ? registerId : undefined }));
  }

  function linkByQr() {
    if (!preconditions()) return;
    if (device?.status !== "unlinked") return setError("no-device");
    // Simulated scan: reads exactly what the terminal's QR carries.
    handle(link({ method: "qr", payload: qrPayload(device), branchId, registerId: isCaja ? registerId : undefined }));
  }

  if (device === undefined) return null;

  if (device === null) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-card-title text-text-primary">No hay ningún equipo esperando vinculación</p>
          <p className="mt-2 text-body-sm text-text-secondary">{emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  if (device.status === "linked") {
    const branch = findBranchById(device.branchId);
    const register = findRegisterById(device.registerId);
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {noun} {device.deviceId}
          </CardTitle>
          <Badge variant="success">
            <Link2 aria-hidden="true" />
            Vinculado
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className={isCaja ? "grid grid-cols-4 gap-6" : "grid grid-cols-3 gap-6"}>
            <ReadOnlyValue label="Sede">{branch?.name ?? device.branchId}</ReadOnlyValue>
            {isCaja ? <ReadOnlyValue label="Caja">{register?.name ?? "—"}</ReadOnlyValue> : null}
            <ReadOnlyValue label="Vinculado">{formatDateTime(new Date(device.linkedAt))}</ReadOnlyValue>
            <ReadOnlyValue label="Método">
              {device.linkMethod === "qr" ? "Escaneo del código QR" : "Código escrito"}
            </ReadOnlyValue>
          </div>
          <div className="flex justify-end border-t border-border pt-5">
            <Button variant="destructive" onClick={() => setConfirmUnlink(true)}>
              <Link2Off aria-hidden="true" />
              Desvincular
            </Button>
          </div>
        </CardContent>

        <Dialog open={confirmUnlink} onOpenChange={setConfirmUnlink}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Desvincular este equipo?</DialogTitle>
              <DialogDescription>
                Dejará de ser {isCaja && register ? `${register.name} de ` : "parte de "}
                {branch?.name ?? "su sede"}.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <p className="text-body-sm text-text-secondary">
                {isCaja
                  ? "El equipo vuelve de inmediato a la pantalla de vinculación y se cierra la sesión del trabajador que lo esté usando. La jornada de la caja no se cierra: sigue abierta hasta su arqueo y cierre."
                  : "El kiosco vuelve de inmediato a la pantalla de vinculación. Si un cliente estaba preparando una solicitud, se descarta. Las solicitudes ya generadas siguen siendo válidas en caja."}
              </p>
            </DialogBody>
            <DialogFooter>
              <Button variant="tertiary" onClick={() => setConfirmUnlink(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  unlink();
                  setConfirmUnlink(false);
                  setBranchId("");
                  setRegisterId("");
                }}
              >
                Sí, desvincular
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {noun} {device.deviceId}
        </CardTitle>
        <Badge variant="warning">Esperando vinculación</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-6">
          <Field {...branchField}>
            <Select
              value={branchId}
              onValueChange={(value) => {
                setBranchId(value);
                setRegisterId("");
                setError(null);
              }}
            >
              <SelectTrigger {...fieldAria(branchField)}>
                <SelectValue placeholder="Elige una sede" />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isCaja ? (
            <Field {...registerField}>
              <Select
                value={registerId}
                disabled={!branchId}
                onValueChange={(value) => {
                  setRegisterId(value);
                  setError(null);
                }}
              >
                <SelectTrigger {...fieldAria(registerField)}>
                  <SelectValue placeholder={branchId ? "Elige una caja" : "Elige primero la sede"} />
                </SelectTrigger>
                <SelectContent>
                  {registersOf(branchId).map((register) => (
                    <SelectItem
                      key={register.id}
                      value={register.id}
                      // The demo's operational data (balances, jornada,
                      // movements) belongs to one simulated caja only.
                      disabled={register.name !== CAJA_SUMMARY.register}
                    >
                      {register.name}
                      {register.name !== CAJA_SUMMARY.register ? " · sin datos en la demo" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <form onSubmit={linkByCode} className="flex flex-col gap-4 rounded-card border border-border p-5" noValidate>
            <MethodTitle icon={KeyRound} title="Con el código" />
            <Field {...codeField}>
              <Input
                {...fieldAria(codeField)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000 000"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (error) setError(null);
                }}
                className="pc-numeric tracking-[0.08em]"
              />
            </Field>
            <p className="text-caption text-text-secondary">
              Pista de la demo: el equipo muestra ahora{" "}
              <span className="pc-numeric font-semibold">{formatPairingCode(device.pairing.code)}</span>.
            </p>
            <Button type="submit" className="self-start" disabled={code.replace(/\D/g, "").length !== 6}>
              Vincular con código
            </Button>
          </form>

          <div className="flex flex-col gap-4 rounded-card border border-border p-5">
            <MethodTitle icon={QrCode} title="Con el código QR" />
            <p className="text-body-sm text-text-secondary">
              En el producto real, el admin abre esta sección en su teléfono y apunta la cámara al QR del
              equipo. Aquí el escaneo se simula.
            </p>
            <Button variant="secondary" className="mt-auto self-start" onClick={linkByQr}>
              <ScanLine aria-hidden="true" />
              Simular escaneo del QR
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MethodTitle({ icon: Icon, title }: { icon: typeof KeyRound; title: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary">
        <Icon className="size-[18px]" />
      </span>
      <h3 className="text-card-title text-text-primary">{title}</h3>
    </div>
  );
}
