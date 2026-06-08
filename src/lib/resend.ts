import { Resend } from "resend";
import { buildGoogleCalendarUrl } from "./calendar";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendConfirmationEmail(params: {
  to: string;
  pacienteNombre: string;
  medicoNombre: string;
  especialidad: string;
  fecha: string;
  hora: string;
  monto: number;
  motivo?: string | null;
}) {
  const fechaFmt = new Date(params.fecha + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const calendarUrl = buildGoogleCalendarUrl({
    title: `Cita médica — ${params.medicoNombre}`,
    date: params.fecha,
    time: params.hora,
    details: [
      `Médico: ${params.medicoNombre}`,
      `Especialidad: ${params.especialidad}`,
      `Paciente: ${params.pacienteNombre}`,
      params.motivo ? `Motivo: ${params.motivo}` : "",
      `Monto pagado: $${params.monto.toFixed(2)} USD`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: params.to,
    subject: `Cita confirmada con ${params.medicoNombre}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #e8e8e8; background: #111; padding: 32px; border-radius: 12px;">
        <h1 style="color: #fff; font-size: 22px; margin: 0 0 8px;">Cita confirmada</h1>
        <p style="color: #888; margin: 0 0 24px;">Hola ${params.pacienteNombre}, tu reserva ha sido confirmada.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #888;">Médico</td><td style="padding: 8px 0; text-align: right;">${params.medicoNombre}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Especialidad</td><td style="padding: 8px 0; text-align: right;">${params.especialidad}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Fecha</td><td style="padding: 8px 0; text-align: right;">${fechaFmt}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Hora</td><td style="padding: 8px 0; text-align: right;">${params.hora.slice(0, 5)}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Monto</td><td style="padding: 8px 0; text-align: right; color: #4ade80;">$${params.monto.toFixed(2)} USD</td></tr>
        </table>
        <a href="${calendarUrl}" style="display: inline-block; margin-top: 28px; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Agregar a Google Calendar
        </a>
        <p style="color: #555; font-size: 12px; margin-top: 32px;">Este es un correo automático, no respondas a este mensaje.</p>
      </div>
    `,
  });
}
