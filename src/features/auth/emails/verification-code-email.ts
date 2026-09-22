/**
 * Correo transaccional del código de verificación (2FA).
 *
 * Construye el asunto, el pre-encabezado y los dos cuerpos — HTML y texto
 * plano — del único correo que PuntoCash envía durante el acceso. Es una
 * función pura: no envía nada y no conoce el proveedor de correo. El backend
 * la llama y entrega el resultado a su transporte (SES, Sendgrid, SMTP…).
 *
 * ── Restricciones de un correo, que no son las de la aplicación ───────────
 *
 * Esto no es una pantalla: el cliente de correo reescribe el documento, no
 * carga hojas de estilo externas y a menudo tampoco las tipografías. De ahí
 * las decisiones que aquí se ven raras y en la aplicación no existen:
 *
 *   · Maquetación con `<table>` — Outlook no implementa flex ni grid, y un
 *     `<div>` con `max-width` se desborda al 100% del ancho. El ancho se
 *     declara a la vez como atributo (`width="600"`, para Outlook) y como
 *     `width:100%;max-width:600px`, para que los clientes que sí reflujan lo
 *     hagan en pantallas estrechas.
 *   · Estilos en línea — casi ningún cliente respeta un `<style>` externo, y
 *     varios eliminan incluso el interno.
 *   · Sin SVG y sin iconos remotos obligatorios: el isotipo es una imagen
 *     opcional (`logoUrl`) y el logotipo es texto, de modo que el correo
 *     sigue siendo PuntoCash con las imágenes bloqueadas, que es como lo
 *     recibirá la mayoría.
 *   · Montserrat se declara primero, pero la marca debe seguir reconocible
 *     con la alternativa del sistema.
 *   · Los colores son los hexadecimales oficiales del manual §3, escritos a
 *     mano porque aquí no hay tokens: navy #0B132B, dorado #D4AF37,
 *     crema #F5F1E6, antracita #1A1D23, gris #6B7280, gris claro #E5E7EB.
 *
 * ── Reglas de contenido ───────────────────────────────────────────────────
 *
 *   1. El código **no va en el asunto**: el asunto se lee en la pantalla de
 *      bloqueo del teléfono, delante de quien esté al lado del mostrador.
 *   2. El correo no lleva ningún enlace de inicio de sesión ni botón que
 *      complete el acceso. Un código que se verifica desde el correo es un
 *      código que cualquiera con acceso al buzón puede usar; aquí el código
 *      se teclea en la caja, en la pantalla que ya está abierta.
 *   3. No aparece la sede, ni la caja, ni el nombre del mercante: cuando este
 *      correo se envía todavía no hay sesión ni identidad verificada, y la
 *      marca visible es siempre PuntoCash.
 *   4. El correo dice qué hacer si el intento no fue del trabajador. Es la
 *      única señal de acceso indebido que recibe antes de que alguien entre.
 */

export interface VerificationCodeEmailInput {
  /** Nombre del trabajador, tal como está registrado. */
  workerName: string;
  /** El código emitido. Solo dígitos. */
  code: string;
  /** Minutos de vigencia del código, para decirlo en el cuerpo. */
  expiresInMinutes: number;
  /** Momento del intento de acceso. */
  requestedAt: Date;
  /** Zona horaria con la que se representa la fecha. */
  timeZone?: string;
  /**
   * URL absoluta del isotipo en PNG (fondo transparente, alto ≥ 96px).
   * Opcional: sin ella el encabezado usa solo el logotipo tipográfico.
   */
  logoUrl?: string;
}

export interface VerificationCodeEmail {
  subject: string;
  /** Primera línea que muestra la bandeja de entrada junto al asunto. */
  preheader: string;
  html: string;
  text: string;
}

const NAVY = "#0B132B";
const GOLD = "#D4AF37";
const CREAM = "#F5F1E6";
const ANTHRACITE = "#1A1D23";
const GRAY = "#6B7280";
const GRAY_LIGHT = "#E5E7EB";
const WHITE = "#FFFFFF";

const FONT = "'Montserrat', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Cifras tabulares donde el cliente de correo las soporte; si no, ignora. */
const NUMERIC = "font-variant-numeric:tabular-nums;";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** `dd/MM/yyyy · HH:mm` — el mismo formato que la aplicación (FR-FMT-2). */
function formatTimestamp(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("day")}/${get("month")}/${get("year")} · ${get("hour")}:${get("minute")}`;
}

export function buildVerificationCodeEmail(
  input: VerificationCodeEmailInput,
): VerificationCodeEmail {
  const { workerName, code, expiresInMinutes, requestedAt, timeZone, logoUrl } = input;

  const name = workerName.trim();
  const firstName = name.split(/\s+/)[0] || name;
  const when = formatTimestamp(requestedAt, timeZone);

  const subject = "Código de verificación para iniciar sesión · PuntoCash";
  const preheader = `Vence en ${expiresInMinutes} minutos. No compartas este código con nadie.`;

  const text = [
    `PUNTO CASH · Casa de cambio`,
    ``,
    `Hola ${firstName}:`,
    ``,
    `Este es tu código para completar el inicio de sesión en PuntoCash:`,
    ``,
    `    ${code}`,
    ``,
    `Vence en ${expiresInMinutes} minutos y solo puede usarse una vez.`,
    `Escríbelo en la pantalla de verificación que ya tienes abierta.`,
    ``,
    `Intento de acceso: ${when}`,
    ``,
    `PuntoCash nunca te pedirá este código por teléfono, por mensaje ni por`,
    `correo. Nadie del equipo tiene motivo para pedírtelo: no lo compartas`,
    `con ninguna persona, tampoco con un administrador.`,
    ``,
    `Si no intentaste iniciar sesión, no uses este código, cambia tu`,
    `contraseña y avisa de inmediato al administrador de tu sede.`,
    ``,
    `—`,
    `PuntoCash · Sistema interno`,
    `Correo automático. No responder.`,
  ].join("\n");

  /* El pre-encabezado se oculta a la vista y se rellena con espacios de ancho
     cero, para que la bandeja no siga mostrando el inicio del cuerpo detrás. */
  const hiddenPreheader = `
        <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">
          ${escapeHtml(preheader)}${"&#847;&zwnj;&nbsp;".repeat(40)}
        </div>`;

  const logo = logoUrl
    ? `
                    <tr>
                      <td align="center" style="padding:0 0 18px 0;">
                        <img src="${escapeHtml(logoUrl)}" width="34" height="45" alt=""
                             style="display:block;border:0;outline:none;text-decoration:none;height:45px;width:34px;" />
                      </td>
                    </tr>`
    : "";

  const html = `<!doctype html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <!-- El manual define una única interfaz clara (§6): el correo no ofrece
         variante oscura, y se declara para que el cliente no la invente. -->
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(subject)}</title>
    <style>
      /* Los clientes móviles que respetan media queries reducen el acolchado;
         los que no, siguen viendo la tabla de 600px escalada, que es el
         comportamiento por defecto y sigue siendo legible. */
      @media only screen and (max-width: 480px) {
        .pc-body { padding: 28px 22px 4px 22px !important; }
        .pc-foot { padding: 24px 22px 26px 22px !important; }
        .pc-code { font-size: 30px !important; letter-spacing: 7px !important; text-indent: 7px !important; }
      }
    </style>
    <!--[if mso]>
      <style>
        body, table, td, p, a, span { font-family: 'Segoe UI', Arial, sans-serif !important; }
      </style>
    <![endif]-->
  </head>
  <body style="margin:0;padding:0;background-color:#F8FAFC;">
${hiddenPreheader}

    <!-- Lienzo. Un gris muy claro, como el fondo de la aplicación. -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color:#F8FAFC;">
      <tr>
        <td align="center" style="padding:32px 16px;">

          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
                 style="width:100%;max-width:600px;background-color:${WHITE};border:1px solid ${GRAY_LIGHT};border-radius:12px;overflow:hidden;">

            <!-- Encabezado navy: la presencia de marca del producto (§7). -->
            <tr>
              <td align="center" bgcolor="${NAVY}" style="background-color:${NAVY};padding:36px 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  ${logo}
                  <tr>
                    <td align="center"
                        style="font-family:${FONT};font-size:26px;line-height:30px;font-weight:700;letter-spacing:-0.3px;color:${WHITE};">
                      PUNTO<span style="color:${GOLD};"> CASH</span>
                    </td>
                  </tr>
                  <tr>
                    <td align="center"
                        style="font-family:${FONT};font-size:9px;line-height:14px;font-weight:500;letter-spacing:3.4px;text-transform:uppercase;color:#B9BEC9;padding-top:7px;">
                      Casa de cambio
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Filete dorado: el dorado es línea de acento, nunca superficie (§3). -->
            <tr>
              <td bgcolor="${GOLD}" style="background-color:${GOLD};height:3px;line-height:3px;font-size:0;">&nbsp;</td>
            </tr>

            <!-- Cuerpo -->
            <tr>
              <td class="pc-body" style="padding:36px 40px 8px 40px;font-family:${FONT};">

                <p style="margin:0 0 20px 0;font-size:20px;line-height:28px;font-weight:600;color:${ANTHRACITE};">
                  Hola ${escapeHtml(firstName)}:
                </p>

                <p style="margin:0 0 28px 0;font-size:15px;line-height:24px;color:${ANTHRACITE};">
                  Recibimos un intento de inicio de sesión con tu cuenta de PuntoCash.
                  Escribe este código en la pantalla de verificación para completarlo.
                </p>

                <!-- El código. Único elemento protagonista del correo. -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="${CREAM}"
                        style="background-color:${CREAM};border:1px solid #E6D9A8;border-radius:12px;padding:26px 16px;">
                      <div class="pc-code" style="font-family:${FONT};font-size:36px;line-height:42px;font-weight:700;letter-spacing:10px;text-indent:10px;color:${NAVY};${NUMERIC}">
                        ${escapeHtml(code)}
                      </div>
                      <div style="font-family:${FONT};font-size:13px;line-height:18px;color:#5C5847;padding-top:12px;">
                        Vence en ${expiresInMinutes} minutos · un solo uso
                      </div>
                    </td>
                  </tr>
                </table>

                <p style="margin:26px 0 0 0;font-size:15px;line-height:24px;color:${ANTHRACITE};">
                  El código solo sirve en la pantalla que ya tienes abierta. Si la cerraste,
                  vuelve a iniciar sesión y te enviaremos uno nuevo.
                </p>

                <!-- Contexto del intento. Lo que permite al trabajador reconocerlo. -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="margin:28px 0 0 0;border-top:1px solid ${GRAY_LIGHT};">
                  <tr>
                    <td style="padding:16px 0 0 0;font-family:${FONT};font-size:13px;line-height:18px;color:${GRAY};">
                      Intento de acceso
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0 0 0;font-family:${FONT};font-size:15px;line-height:22px;font-weight:500;color:${ANTHRACITE};${NUMERIC}">
                      ${escapeHtml(when)}
                    </td>
                  </tr>
                </table>

                <!-- Aviso de seguridad. Sin color de alarma: es la norma, no un
                     incidente. El rojo se reserva para lo que ya salió mal (§18). -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="margin:28px 0 0 0;">
                  <tr>
                    <td bgcolor="#F8FAFC"
                        style="background-color:#F8FAFC;border:1px solid ${GRAY_LIGHT};border-radius:12px;padding:18px 20px;font-family:${FONT};">
                      <p style="margin:0 0 8px 0;font-size:14px;line-height:20px;font-weight:600;color:${ANTHRACITE};">
                        No compartas este código
                      </p>
                      <p style="margin:0;font-size:14px;line-height:21px;color:${GRAY};">
                        PuntoCash nunca te pedirá este código por teléfono, por mensaje ni por
                        correo, y nadie del equipo tiene motivo para pedírtelo — tampoco un
                        administrador.
                      </p>
                      <p style="margin:12px 0 0 0;font-size:14px;line-height:21px;color:${GRAY};">
                        <strong style="color:${ANTHRACITE};font-weight:600;">Si no intentaste iniciar sesión:</strong>
                        no uses el código, cambia tu contraseña y avisa de inmediato al
                        administrador de tu sede.
                      </p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Pie -->
            <tr>
              <td class="pc-foot" style="padding:32px 40px 34px 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="border-top:1px solid ${GRAY_LIGHT};">
                  <tr>
                    <td align="center"
                        style="padding:20px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${GRAY};">
                      PuntoCash · Sistema interno<br />
                      Correo automático. No responder.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </body>
</html>
`;

  return { subject, preheader, html, text };
}
