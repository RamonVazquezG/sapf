// Utilidades compartidas por las acciones de servidor (no es un módulo "use server").

/** Estado devuelto por las acciones hacia los formularios cliente. */
export type EstadoAccion = { ok?: string; error?: string; t?: number } | null;

/**
 * Extrae un campo de texto del formulario. Lanza error si es obligatorio y está vacío.
 */
export function texto(fd: FormData, campo: string, obligatorio = true): string {
  const valor = String(fd.get(campo) ?? "").trim();
  if (obligatorio && !valor) throw new Error(`El campo "${campo}" es obligatorio`);
  return valor;
}

/**
 * Traduce errores de PostgreSQL a mensajes legibles en español.
 */
function traducirError(e: unknown): string {
  const err = e as { code?: string; message?: string; detail?: string };
  switch (err.code) {
    case "23505":
      return "Ya existe un registro con ese valor único" + (err.detail ? ` (${err.detail})` : "");
    case "23503":
      return "El registro está vinculado a otros datos o la referencia no existe";
    case "22P02":
      return "Identificador inválido";
    case "ECONNREFUSED":
      return "No se pudo conectar con el nodo de base de datos";
    default:
      return err.message ?? "Error desconocido";
  }
}

/**
 * Ejecuta una operación y la envuelve en un EstadoAccion con mensaje de éxito o error.
 */
export async function ejecutar(fn: () => Promise<string>): Promise<EstadoAccion> {
  try {
    return { ok: await fn(), t: Date.now() };
  } catch (e) {
    return { error: traducirError(e), t: Date.now() };
  }
}
