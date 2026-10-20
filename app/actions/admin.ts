"use server";

import { refresh } from "next/cache";
import { getCatalogPool } from "@/lib/db/catalog";
import { invalidarPoolFacultad } from "@/lib/db/nodeResolver";
import { migrarNodoFacultad } from "@/lib/db/migrations";
import { q } from "@/lib/data";
import { ejecutar, texto, type EstadoAccion } from "./util";

// Acciones de servidor del módulo administrativo (Fase 2).
// Todas siguen la firma (estadoPrevio, formData) para usarse con useActionState.

/* ───────────────────────── Facultades (catálogo central) ───────────────────────── */

/** Registra una facultad en el catálogo y aplica el esquema en su nodo de base de datos. */
export async function crearFacultad(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    const id = texto(fd, "id").toLowerCase();
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error("El slug sólo admite minúsculas, números y guiones");
    const nodo = {
      db_host: texto(fd, "db_host"),
      db_port: Number(texto(fd, "db_port") || 5432),
      db_name: texto(fd, "db_name"),
      db_user: texto(fd, "db_user"),
      db_password: texto(fd, "db_password", false),
    };
    // 1. Migrar primero el nodo: si no es accesible, no se registra la facultad
    await migrarNodoFacultad(nodo);
    // 2. Registrar en el catálogo central
    await getCatalogPool().query(
      `INSERT INTO faculties (id, name, db_host, db_port, db_name, db_user, db_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, texto(fd, "name"), nodo.db_host, nodo.db_port, nodo.db_name, nodo.db_user, nodo.db_password]
    );
    refresh();
    return "Facultad registrada y nodo migrado";
  });
}

/** Activa o desactiva una facultad. */
export async function alternarFacultad(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    const id = texto(fd, "id");
    await getCatalogPool().query("UPDATE faculties SET is_active = NOT is_active WHERE id = $1", [id]);
    await invalidarPoolFacultad(id);
    refresh();
    return "Estado actualizado";
  });
}

/** Elimina una facultad del catálogo (los datos del nodo NO se borran). */
export async function eliminarFacultad(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    const id = texto(fd, "id");
    await getCatalogPool().query("DELETE FROM faculties WHERE id = $1", [id]);
    await invalidarPoolFacultad(id);
    refresh();
    return "Facultad eliminada del catálogo";
  });
}

/* ───────────────────────── Entidades del nodo de facultad ───────────────────────── */

/** Crea una carrera. */
export async function crearCarrera(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    await q(texto(fd, "facultad"), "INSERT INTO degree_programs (code, name) VALUES ($1, $2)", [
      texto(fd, "code").toUpperCase(),
      texto(fd, "name"),
    ]);
    refresh();
    return "Carrera creada";
  });
}

/** Crea un grupo vinculado a una carrera. */
export async function crearGrupo(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    await q(
      texto(fd, "facultad"),
      "INSERT INTO groups (degree_program_id, code, academic_term) VALUES ($1, $2, $3)",
      [texto(fd, "degree_program_id"), texto(fd, "code"), texto(fd, "academic_term")]
    );
    refresh();
    return "Grupo creado";
  });
}

/** Crea una materia en el catálogo de la facultad. */
export async function crearMateria(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    await q(texto(fd, "facultad"), "INSERT INTO subjects (code, name, credits) VALUES ($1, $2, $3)", [
      texto(fd, "code").toUpperCase(),
      texto(fd, "name"),
      Number(texto(fd, "credits", false) || 0),
    ]);
    refresh();
    return "Materia creada";
  });
}

/** Asigna una materia a un grupo, con profesor y horario opcionales. */
export async function asignarMateria(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    const dia = texto(fd, "day", false);
    const inicio = texto(fd, "start", false);
    const fin = texto(fd, "end", false);
    const horario = dia && inicio && fin ? JSON.stringify([{ day: dia, start: inicio, end: fin }]) : null;
    await q(
      texto(fd, "facultad"),
      `INSERT INTO group_subjects (group_id, subject_id, professor_id, schedule_json)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (group_id, subject_id)
       DO UPDATE SET professor_id = EXCLUDED.professor_id,
                     schedule_json = COALESCE(EXCLUDED.schedule_json, group_subjects.schedule_json)`,
      [texto(fd, "group_id"), texto(fd, "subject_id"), texto(fd, "professor_id", false) || null, horario]
    );
    refresh();
    return "Asignación guardada";
  });
}

/** Crea un profesor. */
export async function crearProfesor(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    await q(
      texto(fd, "facultad"),
      "INSERT INTO professors (employee_number, first_name, last_name, email) VALUES ($1, $2, $3, $4)",
      [texto(fd, "employee_number"), texto(fd, "first_name"), texto(fd, "last_name"), texto(fd, "email").toLowerCase()]
    );
    refresh();
    return "Profesor registrado";
  });
}

/** Crea un alumno. */
export async function crearAlumno(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    await q(
      texto(fd, "facultad"),
      "INSERT INTO students (enrollment_number, first_name, last_name, email) VALUES ($1, $2, $3, $4)",
      [texto(fd, "enrollment_number"), texto(fd, "first_name"), texto(fd, "last_name"), texto(fd, "email").toLowerCase()]
    );
    refresh();
    return "Alumno registrado";
  });
}

/**
 * Inscribe a uno o varios alumnos en una materia-grupo.
 * Si se marca "todo el grupo", se inscribe en todas las materias asignadas al grupo de la materia elegida.
 */
export async function inscribirAlumnos(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    const facultad = texto(fd, "facultad");
    const alumnos = fd.getAll("student_id").map(String).filter(Boolean);
    if (alumnos.length === 0) throw new Error("Selecciona al menos un alumno");
    const materiaGrupo = texto(fd, "group_subject_id");
    const todoElGrupo = fd.get("todo_grupo") === "on";
    const filas = await q<{ count: number }>(
      facultad,
      `WITH destino AS (
         SELECT gs.id FROM group_subjects gs
          WHERE gs.id = $1
             OR ($3 AND gs.group_id = (SELECT group_id FROM group_subjects WHERE id = $1))
       ), ins AS (
         INSERT INTO student_enrollments (student_id, group_subject_id)
         SELECT a, d.id FROM unnest($2::uuid[]) a CROSS JOIN destino d
         ON CONFLICT DO NOTHING RETURNING 1
       ) SELECT COUNT(*)::int AS count FROM ins`,
      [materiaGrupo, alumnos, todoElGrupo]
    );
    refresh();
    return `${filas[0]?.count ?? 0} inscripción(es) nueva(s)`;
  });
}

// Tablas que admiten borrado genérico por id desde el panel administrativo
const TABLAS_ELIMINABLES = {
  carrera: "degree_programs",
  grupo: "groups",
  materia: "subjects",
  asignacion: "group_subjects",
  profesor: "professors",
  alumno: "students",
  inscripcion: "student_enrollments",
} as const;

/** Elimina un registro de una de las tablas permitidas del nodo de facultad. */
export async function eliminarRegistro(_: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  return ejecutar(async () => {
    const tipo = texto(fd, "tipo") as keyof typeof TABLAS_ELIMINABLES;
    const tabla = TABLAS_ELIMINABLES[tipo];
    if (!tabla) throw new Error("Tipo de registro no válido");
    await q(texto(fd, "facultad"), `DELETE FROM ${tabla} WHERE id = $1`, [texto(fd, "id")]);
    refresh();
    return "Registro eliminado";
  });
}
