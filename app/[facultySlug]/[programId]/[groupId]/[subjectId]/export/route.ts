import { q } from "@/lib/data";
import { resolverMateria } from "@/lib/jerarquia";

/** Escapa un valor para CSV (comillas dobles y separadores). */
function celda(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Exporta a CSV la matriz de asistencia (alumnos × fechas) de una materia-grupo,
 * con el porcentaje final por alumno. Compatible con Excel (BOM UTF-8).
 */
export async function GET(_req: Request, ctx: RouteContext<"/[facultySlug]/[programId]/[groupId]/[subjectId]/export">) {
  const p = await ctx.params;
  const { materia } = await resolverMateria(p);

  // 1. Fechas de sesión y registros de la materia
  const fechas = await q<{ id: string; fecha: string }>(
    p.facultySlug,
    "SELECT id, to_char(session_date, 'YYYY-MM-DD') AS fecha FROM attendance_sessions WHERE group_subject_id = $1 ORDER BY session_date",
    [materia.id]
  );
  const filas = await q<{ id: string; enrollment_number: string; nombre: string; estados: Record<string, string> | null }>(
    p.facultySlug,
    `SELECT st.id, st.enrollment_number, st.last_name || ', ' || st.first_name AS nombre,
            jsonb_object_agg(r.session_id, r.status) FILTER (WHERE r.id IS NOT NULL) AS estados
       FROM student_enrollments se
       JOIN students st ON st.id = se.student_id
       LEFT JOIN attendance_records r ON r.student_id = st.id
             AND r.session_id IN (SELECT id FROM attendance_sessions WHERE group_subject_id = $1)
      WHERE se.group_subject_id = $1
      GROUP BY st.id ORDER BY st.last_name, st.first_name`,
    [materia.id]
  );

  // 2. Construcción del documento CSV
  const lineas = [["Matricula", "Alumno", ...fechas.map((f) => f.fecha), "% Asistencia"].map(celda).join(",")];
  for (const f of filas) {
    const estados = fechas.map((s) => f.estados?.[s.id] ?? "");
    const registrados = estados.filter(Boolean);
    const asistidos = registrados.filter((e) => e !== "AUSENTE").length;
    const pct = registrados.length ? ((100 * asistidos) / registrados.length).toFixed(1) : "";
    lineas.push([f.enrollment_number, f.nombre, ...estados, pct].map(celda).join(","));
  }

  const nombre = `asistencia_${materia.subject_code}_${materia.group_code}`.replace(/[^\w-]+/g, "_");
  return new Response("\uFEFF" + lineas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}.csv"`,
    },
  });
}
