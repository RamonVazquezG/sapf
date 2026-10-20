import "server-only";
import { connection } from "next/server";
import { getFacultyDbPool } from "./db/nodeResolver";

// Capa de acceso a datos de los nodos de facultad.
// Todas las consultas reciben el slug de la facultad para enrutar al nodo correcto.

export type EstadoAsistencia = "PRESENTE" | "AUSENTE" | "RETARDO" | "JUSTIFICADO";
export const ESTADOS: EstadoAsistencia[] = ["PRESENTE", "AUSENTE", "RETARDO", "JUSTIFICADO"];

export type Carrera = { id: string; code: string; name: string; total_grupos: number };
export type Grupo = { id: string; degree_program_id: string; code: string; academic_term: string; programa: string };
export type Materia = { id: string; code: string; name: string; credits: number };
export type Profesor = { id: string; employee_number: string; first_name: string; last_name: string; email: string };
export type Alumno = { id: string; enrollment_number: string; first_name: string; last_name: string; email: string };
export type MateriaGrupo = {
  id: string;
  group_id: string;
  subject_id: string;
  professor_id: string | null;
  subject_code: string;
  subject_name: string;
  group_code: string;
  academic_term: string;
  programa: string;
  degree_program_id: string;
  profesor: string | null;
  schedule_json: { day: string; start: string; end: string }[] | null;
  total_alumnos: number;
};

/**
 * Ejecuta una consulta parametrizada contra el nodo de la facultad indicada.
 */
export async function q<T>(facultad: string, sql: string, params: unknown[] = []): Promise<T[]> {
  // Las consultas a los nodos siempre se resuelven en tiempo de petición
  await connection();
  const pool = await getFacultyDbPool(facultad);
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

/** Lista las carreras con su número de grupos. */
export function listarCarreras(f: string) {
  return q<Carrera>(
    f,
    `SELECT p.id, p.code, p.name, COUNT(g.id)::int AS total_grupos
       FROM degree_programs p LEFT JOIN groups g ON g.degree_program_id = p.id
      GROUP BY p.id ORDER BY p.name`
  );
}

/** Obtiene una carrera por id. */
export async function obtenerCarrera(f: string, id: string) {
  const r = await q<Carrera>(f, "SELECT id, code, name, 0 AS total_grupos FROM degree_programs WHERE id = $1", [id]);
  return r[0] ?? null;
}

/** Lista grupos, opcionalmente filtrados por carrera. */
export function listarGrupos(f: string, carreraId?: string) {
  return q<Grupo>(
    f,
    `SELECT g.id, g.degree_program_id, g.code, g.academic_term, p.name AS programa
       FROM groups g JOIN degree_programs p ON p.id = g.degree_program_id
      WHERE ($1::uuid IS NULL OR g.degree_program_id = $1)
      ORDER BY p.name, g.academic_term DESC, g.code`,
    [carreraId ?? null]
  );
}

/** Obtiene un grupo por id. */
export async function obtenerGrupo(f: string, id: string) {
  const r = await q<Grupo>(
    f,
    `SELECT g.id, g.degree_program_id, g.code, g.academic_term, p.name AS programa
       FROM groups g JOIN degree_programs p ON p.id = g.degree_program_id WHERE g.id = $1`,
    [id]
  );
  return r[0] ?? null;
}

/** Lista el catálogo de materias. */
export function listarMaterias(f: string) {
  return q<Materia>(f, "SELECT id, code, name, credits FROM subjects ORDER BY code");
}

/** Lista profesores. */
export function listarProfesores(f: string) {
  return q<Profesor>(f, "SELECT id, employee_number, first_name, last_name, email FROM professors ORDER BY last_name, first_name");
}

/** Lista alumnos. */
export function listarAlumnos(f: string) {
  return q<Alumno>(f, "SELECT id, enrollment_number, first_name, last_name, email FROM students ORDER BY last_name, first_name");
}

const SELECT_MATERIA_GRUPO = `
  SELECT gs.id, gs.group_id, gs.subject_id, gs.professor_id, gs.schedule_json,
         s.code AS subject_code, s.name AS subject_name,
         g.code AS group_code, g.academic_term, g.degree_program_id, p.name AS programa,
         CASE WHEN pr.id IS NULL THEN NULL ELSE pr.first_name || ' ' || pr.last_name END AS profesor,
         (SELECT COUNT(*)::int FROM student_enrollments se WHERE se.group_subject_id = gs.id) AS total_alumnos
    FROM group_subjects gs
    JOIN subjects s ON s.id = gs.subject_id
    JOIN groups g ON g.id = gs.group_id
    JOIN degree_programs p ON p.id = g.degree_program_id
    LEFT JOIN professors pr ON pr.id = gs.professor_id`;

/** Lista asignaciones materia-grupo, opcionalmente de un grupo concreto. */
export function listarMateriasGrupo(f: string, grupoId?: string) {
  return q<MateriaGrupo>(
    f,
    `${SELECT_MATERIA_GRUPO} WHERE ($1::uuid IS NULL OR gs.group_id = $1) ORDER BY p.name, g.code, s.code`,
    [grupoId ?? null]
  );
}

/** Obtiene una asignación materia-grupo por id. */
export async function obtenerMateriaGrupo(f: string, id: string) {
  const r = await q<MateriaGrupo>(f, `${SELECT_MATERIA_GRUPO} WHERE gs.id = $1`, [id]);
  return r[0] ?? null;
}

/** Lista los alumnos inscritos en una materia-grupo. */
export function listarInscritos(f: string, materiaGrupoId: string) {
  return q<Alumno>(
    f,
    `SELECT st.id, st.enrollment_number, st.first_name, st.last_name, st.email
       FROM student_enrollments se JOIN students st ON st.id = se.student_id
      WHERE se.group_subject_id = $1 ORDER BY st.last_name, st.first_name`,
    [materiaGrupoId]
  );
}

export type Sesion = {
  id: string;
  session_date: string;
  signed_off_at: Date | null;
  firmante: string | null;
  presentes: number;
  ausentes: number;
  retardos: number;
  justificados: number;
};

/** Lista las sesiones de una materia-grupo con el resumen de estados. */
export function listarSesiones(f: string, materiaGrupoId: string) {
  return q<Sesion>(
    f,
    `SELECT s.id, to_char(s.session_date, 'YYYY-MM-DD') AS session_date, s.signed_off_at,
            CASE WHEN pr.id IS NULL THEN NULL ELSE pr.first_name || ' ' || pr.last_name END AS firmante,
            COUNT(*) FILTER (WHERE r.status = 'PRESENTE')::int AS presentes,
            COUNT(*) FILTER (WHERE r.status = 'AUSENTE')::int AS ausentes,
            COUNT(*) FILTER (WHERE r.status = 'RETARDO')::int AS retardos,
            COUNT(*) FILTER (WHERE r.status = 'JUSTIFICADO')::int AS justificados
       FROM attendance_sessions s
       LEFT JOIN attendance_records r ON r.session_id = s.id
       LEFT JOIN professors pr ON pr.id = s.signed_off_by
      WHERE s.group_subject_id = $1
      GROUP BY s.id, pr.id ORDER BY s.session_date DESC`,
    [materiaGrupoId]
  );
}

export type ResumenAlumno = Alumno & {
  presentes: number;
  ausentes: number;
  retardos: number;
  justificados: number;
  total: number;
  porcentaje: number | null;
};

/**
 * Calcula el porcentaje de asistencia por alumno en una materia-grupo.
 * Regla: PRESENTE y JUSTIFICADO cuentan como asistencia completa, RETARDO cuenta como asistencia.
 */
export function resumenPorAlumno(f: string, materiaGrupoId: string) {
  return q<ResumenAlumno>(
    f,
    `SELECT st.id, st.enrollment_number, st.first_name, st.last_name, st.email,
            COUNT(r.id) FILTER (WHERE r.status = 'PRESENTE')::int AS presentes,
            COUNT(r.id) FILTER (WHERE r.status = 'AUSENTE')::int AS ausentes,
            COUNT(r.id) FILTER (WHERE r.status = 'RETARDO')::int AS retardos,
            COUNT(r.id) FILTER (WHERE r.status = 'JUSTIFICADO')::int AS justificados,
            COUNT(r.id)::int AS total,
            CASE WHEN COUNT(r.id) = 0 THEN NULL
                 ELSE ROUND(100.0 * COUNT(r.id) FILTER (WHERE r.status <> 'AUSENTE') / COUNT(r.id), 1)::float END AS porcentaje
       FROM student_enrollments se
       JOIN students st ON st.id = se.student_id
       LEFT JOIN attendance_sessions s ON s.group_subject_id = se.group_subject_id
       LEFT JOIN attendance_records r ON r.session_id = s.id AND r.student_id = st.id
      WHERE se.group_subject_id = $1
      GROUP BY st.id ORDER BY st.last_name, st.first_name`,
    [materiaGrupoId]
  );
}

/** Obtiene una sesión (por fecha) y los estados registrados de cada alumno. */
export async function obtenerSesionPorFecha(f: string, materiaGrupoId: string, fecha: string) {
  const sesiones = await q<{ id: string; signed_off_at: Date | null }>(
    f,
    "SELECT id, signed_off_at FROM attendance_sessions WHERE group_subject_id = $1 AND session_date = $2",
    [materiaGrupoId, fecha]
  );
  const sesion = sesiones[0] ?? null;
  const registros = sesion
    ? await q<{ student_id: string; status: EstadoAsistencia; remarks: string | null }>(
        f,
        "SELECT student_id, status, remarks FROM attendance_records WHERE session_id = $1",
        [sesion.id]
      )
    : [];
  return { sesion, registros };
}
