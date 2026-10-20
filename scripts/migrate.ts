/**
 * Script de migración orquestada (Fase 6).
 * Aplica db/faculty.sql en TODOS los nodos de facultad registrados en el catálogo.
 * Uso: pnpm db:migrate
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

async function main() {
  // 1. Conectar con el catálogo central y obtener la lista de nodos
  const catalogo = new Pool({
    connectionString:
      process.env.CATALOG_DATABASE_URL ?? "postgres://postgres:root_password@localhost:5432/catalog_db",
  });
  const esquemaCatalogo = await readFile(path.join(process.cwd(), "db", "catalog.sql"), "utf8");
  await catalogo.query(esquemaCatalogo);
  const { rows: nodos } = await catalogo.query("SELECT * FROM faculties WHERE is_active = true");
  await catalogo.end();

  // 2. Aplicar el esquema de facultad en cada nodo, reportando el resultado individual
  const esquema = await readFile(path.join(process.cwd(), "db", "faculty.sql"), "utf8");
  let fallos = 0;
  for (const n of nodos) {
    const pool = new Pool({
      host: n.db_host,
      port: n.db_port,
      database: n.db_name,
      user: n.db_user,
      password: n.db_password,
      connectionTimeoutMillis: 5000,
    });
    try {
      await pool.query(esquema);
      console.log(`✔ ${n.id} migrado (${n.db_host}:${n.db_port}/${n.db_name})`);
    } catch (e) {
      fallos++;
      console.error(`✘ ${n.id} falló: ${(e as Error).message}`);
    } finally {
      await pool.end();
    }
  }
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
