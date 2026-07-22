import { createAdminClient } from "./supabase/admin";
import { sendConfirmationEmail } from "./resend";

type ConfirmarCitaResult = {
  already_confirmed: boolean;
  paciente_nombre: string;
  email: string;
  motivo: string | null;
  monto: number;
  fecha: string;
  hora: string;
  medico_nombre: string;
  especialidad: string;
  error?: string;
};

export async function confirmarCita(citaId: string, captureId?: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("confirmar_cita_db", {
    p_cita_id: citaId,
    p_capture_id: captureId ?? null,
  });

  if (error) throw error;

  const result = data as ConfirmarCitaResult;

  if (result.error === 'cita_no_confirmable') {
    return { alreadyConfirmed: false, nonConfirmable: true };
  }

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.already_confirmed) {
    return { alreadyConfirmed: true };
  }

  sendConfirmationEmail({
    to: result.email,
    pacienteNombre: result.paciente_nombre,
    medicoNombre: result.medico_nombre,
    especialidad: result.especialidad,
    fecha: result.fecha,
    hora: result.hora,
    monto: Number(result.monto),
    motivo: result.motivo,
  }).catch((emailErr) => {
    console.error("Error enviando correo de confirmación:", emailErr);
  });

  return { alreadyConfirmed: false };
}
