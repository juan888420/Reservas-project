export type Medico = {
  id: string;
  nombre: string;
  especialidad: string;
  tarifa: number;
};

export type Slot = {
  id: string;
  medico_id: string;
  fecha: string;
  hora: string;
  disponible: boolean;
};

export type Cita = {
  id: string;
  slot_id: string;
  paciente_nombre: string;
  email: string;
  motivo: string | null;
  monto: number;
  estado: "pendiente" | "confirmada" | "cancelada";
  paypal_order_id: string | null;
  created_at: string;
};

export type CitaConDetalle = Cita & {
  slot: Slot & {
    medico: Medico;
  };
};
