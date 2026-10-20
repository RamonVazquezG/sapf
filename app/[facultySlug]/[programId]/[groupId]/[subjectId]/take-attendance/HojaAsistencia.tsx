"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { guardarAsistencia } from "@/app/actions/asistencia";
import type { EstadoAccion } from "@/app/actions/util";

type Estado = "PRESENTE" | "AUSENTE" | "RETARDO" | "JUSTIFICADO";

// Configuración visual de cada estado (etiqueta corta, atajo de teclado y colores)
const ESTADOS: { valor: Estado; corto: string; tecla: string; activo: string }[] = [
  { valor: "PRESENTE", corto: "P", tecla: "p", activo: "bg-emerald-600 text-white border-emerald-600" },
  { valor: "RETARDO", corto: "R", tecla: "r", activo: "bg-amber-500 text-white border-amber-500" },
  { valor: "JUSTIFICADO", corto: "J", tecla: "j", activo: "bg-sky-600 text-white border-sky-600" },
  { valor: "AUSENTE", corto: "A", tecla: "a", activo: "bg-red-600 text-white border-red-600" },
];

type Props = {
  facultad: string;
  materiaGrupoId: string;
  fecha: string;
  alumnos: { id: string; enrollment_number: string; first_name: string; last_name: string }[];
  iniciales: Record<string, { status: Estado; remarks: string }>;
  existe: boolean;
  firmada: boolean;
  volver: string;
};

/**
 * Hoja interactiva de pase de lista: marcado rápido, marcar todos, atajos de teclado
 * y guardado transaccional en el nodo de la facultad.
 */
export function HojaAsistencia({ facultad, materiaGrupoId, fecha, alumnos, iniciales, existe, firmada, volver }: Props) {
  // Estado local por alumno; por defecto todos PRESENTE en una sesión nueva
  const [marcas, setMarcas] = useState<Record<string, { status: Estado; remarks: string }>>(() =>
    Object.fromEntries(alumnos.map((a) => [a.id, iniciales[a.id] ?? { status: "PRESENTE", remarks: "" }]))
  );
  const [resultado, setResultado] = useState<EstadoAccion>(null);
  const [sucio, setSucio] = useState(!existe);
  const [pendiente, iniciar] = useTransition();

  /** Cambia el estado (o la observación) de un alumno. */
  const marcar = (id: string, cambio: Partial<{ status: Estado; remarks: string }>) => {
    setMarcas((m) => ({ ...m, [id]: { ...m[id], ...cambio } }));
    setSucio(true);
  };

  /** Aplica un mismo estado a todos los alumnos. */
  const marcarTodos = (status: Estado) => {
    setMarcas((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, status }])));
    setSucio(true);
  };

  /** Envía la lista completa a la acción de servidor. */
  const guardar = () =>
    iniciar(async () => {
      const r = await guardarAsistencia(
        facultad,
        materiaGrupoId,
        fecha,
        Object.entries(marcas).map(([studentId, v]) => ({ studentId, status: v.status, remarks: v.remarks }))
      );
      setResultado(r);
      if (r?.ok) setSucio(false);
    });

  // Conteo en vivo por estado
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e.valor, Object.values(marcas).filter((m) => m.status === e.valor).length]));

  return (
    <div>
      {firmada && (
        <p className="mb-4 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-900">Esta sesión ya fue firmada por el profesor; está en modo de sólo lectura.</p>
      )}

      {/* Barra de acciones masivas y contadores */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {!firmada && (
          <>
            <span className="text-zinc-500">Marcar todos:</span>
            {ESTADOS.map((e) => (
              <button key={e.valor} onClick={() => marcarTodos(e.valor)} className="rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {e.valor.charAt(0) + e.valor.slice(1).toLowerCase()}
              </button>
            ))}
          </>
        )}
        <span className="ml-auto text-zinc-500">
          {ESTADOS.map((e) => `${e.corto}: ${conteo[e.valor]}`).join(" · ")}
        </span>
      </div>

      <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
        {alumnos.map((a, i) => (
          <li
            key={a.id}
            tabIndex={0}
            // Atajos de teclado: P/R/J/A sobre la fila enfocada, y avanzar a la siguiente
            onKeyDown={(ev) => {
              if (firmada || (ev.target as HTMLElement).tagName === "INPUT") return;
              const e = ESTADOS.find((x) => x.tecla === ev.key.toLowerCase());
              if (e) {
                marcar(a.id, { status: e.valor });
                (ev.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
              }
            }}
            className="flex flex-wrap items-center gap-3 px-3 py-2 outline-none focus:bg-indigo-50 dark:focus:bg-indigo-950"
          >
            <span className="w-6 text-right text-xs text-zinc-400">{i + 1}</span>
            <span className="w-28 font-mono text-xs">{a.enrollment_number}</span>
            <span className="min-w-40 flex-1">{a.last_name}, {a.first_name}</span>
            <div className="flex gap-1">
              {ESTADOS.map((e) => (
                <button
                  key={e.valor}
                  disabled={firmada}
                  title={e.valor}
                  onClick={() => marcar(a.id, { status: e.valor })}
                  className={`h-8 w-8 rounded-md border text-sm font-medium disabled:cursor-not-allowed ${
                    marcas[a.id].status === e.valor ? e.activo : "border-zinc-300 text-zinc-500 dark:border-zinc-700"
                  }`}
                >
                  {e.corto}
                </button>
              ))}
            </div>
            <input
              disabled={firmada}
              placeholder="Observación"
              value={marcas[a.id].remarks}
              onChange={(ev) => marcar(a.id, { remarks: ev.target.value })}
              className="w-48 rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-3">
        {!firmada && (
          <button onClick={guardar} disabled={pendiente} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
            {pendiente ? "Guardando…" : "Guardar asistencia"}
          </button>
        )}
        <Link href={volver} className="text-sm text-zinc-500 hover:underline">Volver al tablero</Link>
        {sucio && !firmada && <span className="text-xs text-amber-600">Cambios sin guardar</span>}
        {resultado?.ok && !sucio && <span className="text-sm text-emerald-600">{resultado.ok}</span>}
        {resultado?.error && <span className="text-sm text-red-600">{resultado.error}</span>}
      </div>
      <p className="mt-2 text-xs text-zinc-400">Atajo: enfoca una fila (Tab) y pulsa P, R, J o A.</p>
    </div>
  );
}
