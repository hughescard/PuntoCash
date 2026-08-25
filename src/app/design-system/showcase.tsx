import * as React from "react";
import { ArrowLeft, Check, Inbox, Plus } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  fieldAria,
  type FieldSpec,
  Input,
  ReadOnlyValue,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { OperationStatusBadge } from "@/components/patterns/operation-status-badge";
import { Logo } from "@/components/brand/logo";
import { AppHeader, AppMain, AppShell, PageHeader, Section } from "@/components/shell/app-shell";
import { formatAmount, formatCurrencyOption, formatMoney, formatRate } from "@/lib/format";
import { DesignSystemSidebar } from "./design-system-sidebar";

/* -------------------------------------------------------------------------- */
/* Local documentation helpers — used only by this internal page.              */
/* -------------------------------------------------------------------------- */

function Swatch({
  name,
  value,
  token,
  className,
  border = false,
}: {
  name: string;
  value: string;
  token: string;
  className: string;
  border?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`h-16 rounded-control ${className} ${border ? "border border-border" : ""}`}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-label text-text-primary">{name}</span>
        <span className="pc-numeric text-caption uppercase text-text-secondary">{value}</span>
        <code className="truncate text-caption text-text-secondary" title={token}>
          {token}
        </code>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <span className="text-body-sm text-text-secondary">{label}</span>
      <code className="pc-numeric text-body-sm font-medium text-text-primary">{value}</code>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}

/**
 * One `FieldSpec` per demo control: spread onto `Field` for the visible parts,
 * passed to `fieldAria()` for the attributes the control carries. Declaring
 * them once keeps the two in sync.
 */
const FIELDS = {
  cliente: {
    id: "ds-cliente",
    label: "Nombre del cliente",
    description: "Tal como aparece en el documento de identidad.",
  },
  entregar: {
    id: "ds-entregar",
    label: "Importe a entregar",
    required: true,
  },
  recibir: {
    id: "ds-recibir",
    label: "Importe a recibir",
    error: "La caja no dispone de suficiente EUR para completar esta operación.",
  },
  deshabilitado: {
    id: "ds-deshabilitado",
    label: "Campo deshabilitado",
  },
  monedaOrigen: {
    id: "ds-moneda-origen",
    label: "Moneda de origen",
    description: "Se muestra código y nombre completo.",
  },
  tipoOperacion: {
    id: "ds-tipo-operacion",
    label: "Tipo de operación",
    error: "Selecciona un tipo de operación para continuar.",
  },
  selectorDeshabilitado: {
    id: "ds-selector-deshabilitado",
    label: "Selector deshabilitado",
  },
} as const satisfies Record<string, FieldSpec>;

const operations = [
  { id: "OP-240814-0031", client: "María Gómez", pair: "USD → EUR", amount: 1250, rate: 0.9184, status: "Completada" },
  { id: "OP-240814-0030", client: "Luis Fernández", pair: "EUR → USD", amount: 3400.5, rate: 1.0888, status: "En proceso" },
  { id: "OP-240814-0029", client: "Ana Ruiz", pair: "USD → GBP", amount: 780, rate: 0.7842, status: "Rechazada" },
  { id: "OP-240814-0028", client: "Carlos Méndez", pair: "GBP → USD", amount: 15900, rate: 1.2751, status: "Cancelada" },
] as const;

/** Escala de 8px del manual §11. */
const spacingScale = [
  { token: "space-1", value: "4px" },
  { token: "space-2", value: "8px" },
  { token: "space-3", value: "12px" },
  { token: "space-4", value: "16px" },
  { token: "space-6", value: "24px" },
  { token: "space-8", value: "32px" },
  { token: "space-10", value: "40px" },
  { token: "space-12", value: "48px" },
] as const;


/* -------------------------------------------------------------------------- */

export function DesignSystemShowcase(): React.JSX.Element {
  return (
    <AppShell
      header={
        <AppHeader
          brand={<Logo variant="onDark" size="md" />}
          actions={
            <>
              <Badge variant="accent">Uso interno</Badge>
              <span className="text-label text-text-on-primary-muted">Sistema de diseño v1.0</span>
            </>
          }
        />
      }
      sidebar={<DesignSystemSidebar />}
    >
      <AppMain>
        <PageHeader
          title="Sistema de diseño PuntoCash"
          description="Página interna de validación. Refleja los tokens y componentes definidos en el Manual de Marca y Sistema UI v1.0. No forma parte de ningún producto."
          actions={
            <>
              <Button variant="tertiary">Ver manual</Button>
              <Button variant="primary">Acción primaria</Button>
            </>
          }
        />

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Color"
          description="Paleta oficial (§3) y roles de interfaz (§13). El navy estructura, el blanco facilita la lectura y el dorado identifica sin convertirse en superficie dominante."
        >
          <div id="color" className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Paleta de marca</CardTitle>
                  <CardDescription>Valores oficiales del manual. No deben redefinirse.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-6 xl:grid-cols-7">
                  <Swatch name="Azul Navy" value="#0B132B" token="--color-navy" className="bg-navy" />
                  <Swatch name="Dorado" value="#D4AF37" token="--color-gold" className="bg-gold" />
                  <Swatch name="Blanco" value="#FFFFFF" token="--color-white" className="bg-white" border />
                  <Swatch name="Antracita" value="#1A1D23" token="--color-anthracite" className="bg-anthracite" />
                  <Swatch name="Gris" value="#6B7280" token="--color-gray" className="bg-gray" />
                  <Swatch name="Gris claro" value="#E5E7EB" token="--color-gray-light" className="bg-gray-light" />
                  <Swatch name="Crema" value="#F5F1E6" token="--color-cream" className="bg-cream" border />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Colores semánticos</CardTitle>
                    <CardDescription>Reservados para estado. El dorado nunca comunica error, alerta o éxito.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-6">
                    <Swatch name="Éxito" value="#16A34A" token="--color-success" className="bg-success" />
                    <Swatch name="Advertencia" value="#D97706" token="--color-warning" className="bg-warning" />
                    <Swatch name="Error" value="#DC2626" token="--color-error" className="bg-error" />
                    <Swatch name="Información" value="#2563EB" token="--color-info" className="bg-info" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Proporción en interfaz</CardTitle>
                    <CardDescription>Regla de balance del manual (§3).</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex h-10 overflow-hidden rounded-control border border-border">
                    <div className="flex w-[68%] items-center justify-center bg-white text-caption text-text-secondary">
                      Blanco 60-75%
                    </div>
                    <div className="flex w-[20%] items-center justify-center bg-navy text-caption text-white">
                      Navy 15-25%
                    </div>
                    <div className="flex w-[12%] items-center justify-center bg-gray-light text-caption text-text-primary">
                      Grises
                    </div>
                  </div>
                  <SpecRow label="Superficies de trabajo" value="60-75%" />
                  <SpecRow label="Navegación, header, CTA" value="15-25%" />
                  <SpecRow label="Bordes y texto secundario" value="10-15%" />
                </CardContent>
              </Card>
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Tipografía"
          description="Montserrat en cuatro pesos: Regular 400, Medium 500, SemiBold 600 y Bold 700 (§4, §12)."
        >
          <div id="tipografia" className="grid grid-cols-[1.6fr_1fr] gap-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Escala tipográfica</CardTitle>
                  <CardDescription>Jerarquía definida en §12 &ldquo;Tipografía digital&rdquo;.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div>
                  <p className="text-screen-title text-text-primary">Título de pantalla</p>
                  <p className="mt-1 text-caption text-text-secondary">28px · 700 · text-screen-title</p>
                </div>
                <div>
                  <p className="text-section-title text-text-primary">Título de sección</p>
                  <p className="mt-1 text-caption text-text-secondary">20px · 600 · text-section-title</p>
                </div>
                <div>
                  <p className="text-card-title text-text-primary">Título de tarjeta</p>
                  <p className="mt-1 text-caption text-text-secondary">16px · 600 · text-card-title</p>
                </div>
                <div>
                  <p className="text-body text-text-primary">
                    Texto principal para lectura e instrucciones operativas.
                  </p>
                  <p className="mt-1 text-caption text-text-secondary">15px · 400 · text-body</p>
                </div>
                <div>
                  <p className="text-label text-text-primary">Label de campo</p>
                  <p className="mt-1 text-caption text-text-secondary">14px · 500 · text-label</p>
                </div>
                <div>
                  <p className="text-caption text-text-secondary">
                    Texto auxiliar para ayudas, metadatos y notas.
                  </p>
                  <p className="mt-1 text-caption text-text-secondary">13px · 400 · text-caption</p>
                </div>
              </CardContent>
            </Card>

            <Card tone="accent">
              <CardHeader>
                <div>
                  <CardTitle>Importes</CardTitle>
                  <CardDescription>
                    24-32px SemiBold/Bold, cifras tabulares y separadores consistentes (§12).
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div>
                  <p className="text-caption text-text-secondary">PuntoCash entrega</p>
                  <p className="pc-numeric text-amount-lg text-text-primary">
                    {formatMoney({ amount: 12480.5, currency: "EUR" })}
                  </p>
                  <p className="mt-1 text-caption text-text-secondary">32px · 700 · text-amount-lg</p>
                </div>
                <div>
                  <p className="text-caption text-text-secondary">PuntoCash recibe</p>
                  <p className="pc-numeric text-amount text-text-primary">
                    {formatMoney({ amount: 13590, currency: "USD" })}
                  </p>
                  <p className="mt-1 text-caption text-text-secondary">24px · 600 · text-amount</p>
                </div>
                <div className="border-t border-accent-border pt-4">
                  <ReadOnlyValue label="Tasa aplicada" numeric>
                    {formatRate(0.9184)}
                  </ReadOnlyValue>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Espaciado, radios y controles"
          description="Escala de 8px, radios por componente y alturas mínimas de control (§11, §14, §20)."
        >
          <div className="grid grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Espaciado</CardTitle>
              </CardHeader>
              <CardContent>
                {spacingScale.map(({ token, value }) => (
                  <SpecRow key={token} label={token} value={value} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Radios</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-control border border-border bg-surface-subtle" aria-hidden="true" />
                  <div>
                    <p className="text-label text-text-primary">Inputs y botones</p>
                    <code className="text-caption text-text-secondary">8px · rounded-control</code>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-card border border-border bg-surface-subtle" aria-hidden="true" />
                  <div>
                    <p className="text-label text-text-primary">Tarjetas</p>
                    <code className="text-caption text-text-secondary">12px · rounded-card</code>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-modal border border-border bg-surface-subtle" aria-hidden="true" />
                  <div>
                    <p className="text-label text-text-primary">Modales</p>
                    <code className="text-caption text-text-secondary">16px · rounded-modal</code>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-12 rounded-pill border border-border bg-surface-subtle" aria-hidden="true" />
                  <div>
                    <p className="text-label text-text-primary">Badges</p>
                    <code className="text-caption text-text-secondary">pill · rounded-pill</code>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Controles y shell</CardTitle>
              </CardHeader>
              <CardContent>
                <SpecRow label="Control mínimo" value="44px" />
                <SpecRow label="Control estándar" value="48px" />
                <SpecRow label="Input de importe" value="56-64px" />
                <SpecRow label="Altura de fila" value="56px" />
                <SpecRow label="Header" value="72px" />
                <SpecRow label="Sidebar" value="240px" />
                <SpecRow label="Padding principal" value="32px" />
                <SpecRow label="Ancho máx. formulario" value="1200px" />
                <SpecRow label="Referencia desktop" value="1440 × 900" />
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Botones"
          description="Una única acción primaria por contexto. El dorado nunca se usa para acciones destructivas (§14)."
        >
          <Card id="botones">
            <CardContent className="flex flex-col gap-8 pt-6">
              <div className="flex flex-col gap-3">
                <p className="text-label text-text-secondary">Variantes</p>
                <Row>
                  <Button variant="primary">Confirmar operación</Button>
                  <Button variant="secondary">
                    <ArrowLeft aria-hidden="true" />
                    Volver
                  </Button>
                  <Button variant="tertiary">Ver más</Button>
                  <Button variant="destructive">Cancelar operación</Button>
                  <Button variant="accent">Acento de marca</Button>
                </Row>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-label text-text-secondary">Tamaños — mínimo 44px, estándar 48px</p>
                <Row>
                  <Button size="sm">44px</Button>
                  <Button size="md">48px estándar</Button>
                  <Button size="lg">56px importe</Button>
                  <Button size="icon" aria-label="Nueva operación">
                    <Plus aria-hidden="true" />
                  </Button>
                </Row>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-label text-text-secondary">Estados</p>
                <Row>
                  <Button loading>Procesando</Button>
                  <Button disabled>Deshabilitado</Button>
                  <Button variant="secondary" disabled>
                    Deshabilitado
                  </Button>
                  <Button variant="primary">
                    <Check aria-hidden="true" />
                    Con icono
                  </Button>
                </Row>
                <p className="text-caption text-text-secondary">
                  Deshabilitar acciones cuando falten datos requeridos y explicar por qué.
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Formularios"
          description="Label encima y persistente; la moneda siempre visible; errores específicos asociados al campo (§15, §20)."
        >
          <div id="formularios" className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inputs</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <Field {...FIELDS.cliente}>
                  <Input placeholder="María Gómez" {...fieldAria(FIELDS.cliente)} />
                </Field>

                <Field {...FIELDS.entregar}>
                  <Input
                    size="lg"
                    numeric
                    prefix="EUR"
                    defaultValue="12.480,50"
                    {...fieldAria(FIELDS.entregar)}
                  />
                </Field>

                <Field {...FIELDS.recibir}>
                  <Input
                    numeric
                    invalid
                    prefix="USD"
                    defaultValue="99.999,00"
                    {...fieldAria(FIELDS.recibir)}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field {...FIELDS.deshabilitado}>
                    <Input
                      disabled
                      placeholder="No disponible"
                      {...fieldAria(FIELDS.deshabilitado)}
                    />
                  </Field>
                  <ReadOnlyValue label="Código de operación">OP-240814-0031</ReadOnlyValue>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Selectores</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {/* Composite control: the wiring lands on the trigger, which is
                    the real focus target, not on the Radix root. */}
                <Field {...FIELDS.monedaOrigen}>
                  <Select defaultValue="USD">
                    <SelectTrigger {...fieldAria(FIELDS.monedaOrigen)}>
                      <SelectValue placeholder="Selecciona una moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">
                        {formatCurrencyOption("USD", "Dólar estadounidense")}
                      </SelectItem>
                      <SelectItem value="EUR">{formatCurrencyOption("EUR", "Euro")}</SelectItem>
                      <SelectItem value="GBP">
                        {formatCurrencyOption("GBP", "Libra esterlina")}
                      </SelectItem>
                      <SelectItem value="CHF">
                        {formatCurrencyOption("CHF", "Franco suizo")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field {...FIELDS.tipoOperacion}>
                  <Select>
                    <SelectTrigger invalid {...fieldAria(FIELDS.tipoOperacion)}>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compra">Compra de divisa</SelectItem>
                      <SelectItem value="venta">Venta de divisa</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field {...FIELDS.selectorDeshabilitado}>
                  <Select disabled>
                    <SelectTrigger {...fieldAria(FIELDS.selectorDeshabilitado)}>
                      <SelectValue placeholder="No disponible" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="x">Opción</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Contenedores, badges y alertas"
          description="Fondo tenue y texto contrastado; el estado nunca depende sólo del color (§16, §18, §20)."
        >
          <div id="contenedores" className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Tarjeta estándar</CardTitle>
                    <CardDescription>Blanco, radio 12px, borde gris claro.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm text-text-secondary">
                    Agrupa información relacionada en lugar de fragmentar cada dato en un bloque
                    independiente.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="tertiary" size="sm">
                    Ver detalle
                  </Button>
                </CardFooter>
              </Card>

              <Card tone="subtle">
                <CardHeader>
                  <div>
                    <CardTitle>Superficie secundaria</CardTitle>
                    <CardDescription>Callouts no críticos.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm text-text-secondary">
                    Fondo gris muy claro para bloques de apoyo dentro del área de trabajo.
                  </p>
                </CardContent>
              </Card>

              <Card tone="accent">
                <CardHeader>
                  <div>
                    <CardTitle>Resumen destacado</CardTitle>
                    <CardDescription>Crema con borde dorado, uso puntual.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm text-text-secondary">
                    El resumen de importes puede recibir mayor jerarquía que el resto de la tarjeta.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Badges de estado</CardTitle>
              </CardHeader>
              <CardContent>
                <Row>
                  <Badge variant="success" icon={<Check aria-hidden="true" />}>
                    Completada
                  </Badge>
                  <Badge variant="info">Información</Badge>
                  <Badge variant="warning">Requiere revisión</Badge>
                  <Badge variant="error">Rechazada</Badge>
                  <Badge variant="neutral">Cancelada</Badge>
                  <Badge variant="accent">Destacado</Badge>
                  <Badge variant="primary">Caja 03</Badge>
                </Row>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <Alert variant="success" title="Operación completada">
                  La operación OP-240814-0031 se registró correctamente y el comprobante está disponible.
                </Alert>
                <Alert variant="warning" title="Atención requerida">
                  Revisa los datos marcados antes de continuar.
                </Alert>
              </div>
              <div className="flex flex-col gap-4">
                <Alert
                  variant="error"
                  title="No se pudo completar la operación"
                  action={
                    <Button variant="secondary" size="sm">
                      Reintentar
                    </Button>
                  }
                >
                  La caja no dispone de suficiente EUR. Solicita una recarga o ajusta el importe.
                </Alert>
                <Alert variant="info" title="Información">
                  Las tasas se actualizan automáticamente cada 15 minutos.
                </Alert>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Modales y confirmaciones</CardTitle>
                  <CardDescription>
                    Reservados para acciones irreversibles o decisiones que deban interrumpir el flujo.
                    Nunca como pantalla de revisión completa de una operación.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Cancelar operación</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>¿Cancelar la operación OP-240814-0031?</DialogTitle>
                      <DialogDescription>
                        Esta acción no se puede deshacer. La operación quedará registrada como cancelada
                        y no afectará al saldo de la caja.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                      <div className="grid grid-cols-2 gap-4 rounded-control bg-surface-subtle p-4">
                        <ReadOnlyValue label="Cliente">María Gómez</ReadOnlyValue>
                        <ReadOnlyValue label="Importe" numeric>
                          {formatMoney({ amount: 1250, currency: "USD" })}
                        </ReadOnlyValue>
                      </div>
                    </DialogBody>
                    <DialogFooter>
                      <Button variant="tertiary">Volver</Button>
                      <Button variant="destructive">Sí, cancelar operación</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Tablas"
          description="Cabecera sobria, filas de 56px, números a la derecha, estados con badge y divisores horizontales (§17)."
        >
          <div id="tablas" className="flex flex-col gap-6">
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operación</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Par</TableHead>
                    <TableHead numeric>Importe</TableHead>
                    <TableHead numeric>Tasa</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((op, index) => (
                    <TableRow key={op.id} interactive selected={index === 0}>
                      <TableCell className="font-medium">
                        <span className="pc-numeric">{op.id}</span>
                      </TableCell>
                      <TableCell>{op.client}</TableCell>
                      <TableCell className="text-text-secondary">{op.pair}</TableCell>
                      <TableCell numeric className="font-medium">
                        {formatAmount(op.amount)}
                      </TableCell>
                      <TableCell numeric className="text-text-secondary">
                        {formatRate(op.rate)}
                      </TableCell>
                      <TableCell>
                        <OperationStatusBadge status={op.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operación</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead numeric>Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableEmptyState
                    colSpan={3}
                    icon={<Inbox aria-hidden="true" />}
                    title="Sin operaciones registradas"
                    description="Las operaciones que realices durante el turno aparecerán aquí."
                    action={<Button size="sm">Nueva operación</Button>}
                  />
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </Section>
      </AppMain>
    </AppShell>
  );
}
