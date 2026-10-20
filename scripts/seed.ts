/**
 * Carga datos de demostración en cada nodo de facultad activo.
 * Es idempotente gracias a ON CONFLICT. Uso: pnpm db:seed
 */
import { Pool } from "pg";

// Datos de ejemplo por facultad
const DEMO: Record<string, { carrera: [string, string]; materias: [string, string, number][]; profesor: [string, string, string, string] }> = {
  ingenieria: {
    carrera: ["ISC", "Ingeniería en Sistemas Computacionales"],
    materias: [["CS101", "Programación I", 8], ["MA101", "Cálculo Diferencial", 6]],
    profesor: ["E-1001", "Ana", "Torres", "ana.torres@uni.mx"],
  },
  medicina: {
    carrera: ["MED", "Médico Cirujano"],
    materias: [["AN101", "Anatomía I", 10], ["BQ101", "Bioquímica", 8]],
    profesor: ["E-2001", "Luis", "Ramírez", "luis.ramirez@uni.mx"],
  },
};

const NOMBRES = ["Sofía", "Mateo", "Valentina", "Santiago", "Camila", "Diego", "Regina", "Emiliano"];
const APELLIDOS = ["García", "Hernández", "López", "Martínez", "Pérez", "Sánchez", "Romero", "Flores"];

async function main() {
  const catalogo = new Pool({
    connectionString: process.env.CATALOG_DATABASE_URL ?? "postgres://postgres:root_password@localhost:5432/catalog_db",
  });
  const { rows: nodos } = await catalogo.query("SELECT * FROM faculties WHERE is_active = true");
  await catalogo.end();

  for (const n of nodos) {
    const demo = DEMO[n.id];
    if (!demo) continue;
    const db = new Pool({ host: n.db_host, port: n.db_port, database: n.db_name, user: n.db_user, password: n.db_password });

    // 1. Carrera, grupo y profesor
    const carrera = (await db.query(
      `INSERT INTO degree_programs (code, name) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`, demo.carrera)).rows[0].id;
    let grupo = (await db.query("SELECT id FROM groups WHERE degree_program_id = $1 AND code = '101'", [carrera])).rows[0]?.id;
    grupo ??= (await db.query("INSERT INTO groups (degree_program_id, code, academic_term) VALUES ($1, '101', '2026-2') RETURNING id", [carrera])).rows[0].id;
    const profesor = (await db.query(
      `INSERT INTO professors (employee_number, first_name, last_name, email) VALUES ($1, $2, $3, $4)
       ON CONFLICT (employee_number) DO UPDATE SET email = EXCLUDED.email RETURNING id`, demo.profesor)).rows[0].id;

    // 2. Alumnos con matrícula derivada del slug de la facultad
    const alumnos: string[] = [];
    for (let i = 0; i < NOMBRES.length; i++) {
      const mat = `${n.id.slice(0, 3).toUpperCase()}26${String(i + 1).padStart(3, "0")}`;
      alumnos.push((await db.query(
        `INSERT INTO students (enrollment_number, first_name, last_name, email) VALUES ($1, $2, $3, $4)
         ON CONFLICT (enrollment_number) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id`,
        [mat, NOMBRES[i], APELLIDOS[i], `${mat.toLowerCase()}@alumnos.uni.mx`])).rows[0].id);
    }

    // 3. Materias asignadas al grupo e inscripción de todos los alumnos
    for (const [code, name, credits] of demo.materias) {
      let materia = (await db.query("SELECT id FROM subjects WHERE code = $1", [code])).rows[0]?.id;
      materia ??= (await db.query("INSERT INTO subjects (code, name, credits) VALUES ($1, $2, $3) RETURNING id", [code, name, credits])).rows[0].id;
      const gs = (await db.query(
        `INSERT INTO group_subjects (group_id, subject_id, professor_id, schedule_json)
         VALUES ($1, $2, $3, '[{"day":"Lunes","start":"08:00","end":"10:00"}]')
         ON CONFLICT (group_id, subject_id) DO UPDATE SET professor_id = EXCLUDED.professor_id RETURNING id`,
        [grupo, materia, profesor])).rows[0].id;
      await db.query(
        `INSERT INTO student_enrollments (student_id, group_subject_id)
         SELECT unnest($1::uuid[]), $2 ON CONFLICT DO NOTHING`, [alumnos, gs]);
    }
    await db.end();
    console.log(`✔ Datos de demostración cargados en ${n.id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
