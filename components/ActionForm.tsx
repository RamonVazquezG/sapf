"use client";

import { useActionState, useEffect, useRef } from "react";
import type { EstadoAccion } from "@/app/actions/util";

type Props = {
  action: (estado: EstadoAccion, fd: FormData) => Promise<EstadoAccion>;
  children: React.ReactNode;
  className?: string;
  /** Texto del botón de envío; si es null no se pinta botón */
  boton?: string | null;
  /** Estilo del botón */
  variante?: "primario" | "peligro" | "suave";
  /** Limpiar el formulario tras un envío exitoso */
  reiniciar?: boolean;
  /** Pedir confirmación antes de enviar */
  confirmar?: string;
};

const ESTILOS = {
  primario: "bg-indigo-600 text-white hover:bg-indigo-500",
  peligro: "text-red-600 hover:bg-red-50 dark:hover:bg-red-950",
  suave: "border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
};

/**
 * Formulario genérico conectado a una acción de servidor mediante useActionState.
 * Muestra el estado pendiente y los mensajes de éxito o error devueltos por la acción.
 */
export function ActionForm({ action, children, className, boton = "Guardar", variante = "primario", reiniciar = true, confirmar }: Props) {
  const [estado, accion, pendiente] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  // Reiniciar los campos sólo cuando la acción termina con éxito
  useEffect(() => {
    if (estado?.ok && reiniciar) ref.current?.reset();
  }, [estado, reiniciar]);

  return (
    <form
      ref={ref}
      action={accion}
      className={className}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {children}
      {boton !== null && (
        <button
          type="submit"
          disabled={pendiente}
          className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${ESTILOS[variante]}`}
        >
          {pendiente ? "…" : boton}
        </button>
      )}
      {estado?.error && <p className="basis-full text-sm text-red-600">{estado.error}</p>}
      {estado?.ok && variante === "primario" && <p className="basis-full text-sm text-emerald-600">{estado.ok}</p>}
    </form>
  );
}
