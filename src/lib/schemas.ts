import { z } from "zod";

export const citaSchema = z.object({
  slot_id: z.string().uuid("slot_id debe ser un UUID válido"),
  paciente_nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre no puede exceder 120 caracteres"),
  email: z
    .string()
    .trim()
    .email("Email inválido"),
  motivo: z
    .string()
    .trim()
    .max(500, "El motivo no puede exceder 500 caracteres")
    .optional()
    .default(""),
});

export const paypalCaptureSchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1, "orderId es requerido"),
});

export const googleCallbackSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Authorization code es requerido"),
  state: z.string().optional(),
});

export const paypalWebhookSchema = z.object({
  event_type: z.string().min(1),
  resource: z
    .object({
      id: z.string().optional(),
      custom_id: z.string().optional(),
      supplementary_data: z
        .object({
          related_ids: z
            .object({
              order_id: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});
