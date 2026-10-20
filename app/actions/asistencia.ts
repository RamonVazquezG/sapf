"use server";

import { refresh } from "next/cache";
import { getFacultyDbPool } from "@/lib/db/nodeResolver";
import { ESTADOS, type EstadoAsistencia } from "@/lib/data";
import { ejecutar, type EstadoAccion } from "./util";

// Acciones del motor de asistencia (Fase 4) y firma de sesiones (Fase 5).

export type RegistroEntrada = { studentId: string; status: EstadoAsistencia; remarks?: string };

/**
 * Guarda la lista de asistencia de una materia-grupo para una fecha.
 * Crea la sesión si no existe y hace UPSERT de cada registro dentro de una transacción
 * en el nodo de la facultad correspondiente.
 *
 * @param facultad - Slug del nodo de base de datos a donde se enrutará la transacción
 * @param materiaGrupoId - Identificador de la materia asignada al grupo
 * @param fecha - Fecha de la sesión (YYYY-MM-DD)
 * @param registros - Estados por alumno
 */
export async function guardarAsistencia(
  facultad: string,
  materiaGrupoId: string,
  fecha: string,
  registros: RegistroEntrada[]
): Promise<EstadoAccion> {
  return ejecutar(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha inválida");
    for (const r of registros) {
      if (!ESTADOS.includes(r.status)) throw new Error(`Estado inválido: ${r.status}`);
    }

    // 1. Obtener conexión directa al nodo de la facultad correspondiente
    const pool = await getFacultyDbPool(facultad);
    const cliente = await pool.connect();
    try {
      await cliente.query("BEGIN");

      // 2. Crear u obtener la sesión del día (bloqueándola para evitar escrituras concurrentes)
      const { rows } = await cliente.query<{ id: string; signed_off_at: Date | null }>(
        `INSERT INTO attendance_sessions (group_subject_id, session_date) VALUES ($1, $2)
         ON CONFLICT (group_subject_id, session_date) DO UPDATE SET session_date = EXCLUDED.session_date
         RETURNING id, signed_off_at`,
        [materiaGrupoId, fecha]
      );
      const sesion = rows[0];
      if (sesion.signed_off_at) throw new Error("La sesión ya fue firmada y no puede modificarse");

      // 3. UPSERT masivo de los registros de asistencia
      if (registros.length > 0) {
        await cliente.query(
          `INSERT INTO attendance_records (session_id, student_id, status, remarks, updated_at)
           SELECT $1, x.student_id, x.status::attendance_status, NULLIF(x.remarks, ''), NOW()
             FROM unnest($2::uuid[], $3::text[], $4::text[]) AS x(student_id, status, remarks)
           ON CONFLICT (session_id, student_id)
           DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks, updated_at = NOW()`,
          [
            sesion.id,
            registros.map((r) => r.studentId),
            registros.map((r) => r.status),
            registros.map((r) => r.remarks ?? ""),
          ]
        );
      }
      await cliente.query("COMMIT");
    } catch (e) {
      await cliente.query("ROLLBACK");
      throw e;
    } finally {
      cliente.release();
    }
    refresh();
    return `Asistencia del ${fecha} guardada (${registros.length} alumnos)`;
  });
}

/**
 * Firma (cierra) una sesión de asistencia a nombre del profesor asignado a la materia.
 * Una vez firmada, la sesión queda bloqueada para edición.
 */
export async function firmarSesion(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    const facultad = String(fd.get("facultad"));
    const sesionId = String(fd.get("session_id"));
    const pool = await getFacultyDbPool(facultad);
    const { rowCount } = await pool.query(
      `UPDATE attendance_sessions s
          SET signed_off_at = NOW(),
              signed_off_by = (SELECT professor_id FROM group_subjects WHERE id = s.group_subject_id)
        WHERE s.id = $1 AND s.signed_off_at IS NULL`,
      [sesionId]
    );
    if (!rowCount) throw new Error("La sesión no existe o ya estaba firmada");
    refresh();
    return "Sesión firmada";
  });
}
