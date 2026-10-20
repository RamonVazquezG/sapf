import "server-only";
import { Pool } from "pg";
import { connection } from "next/server";

/**
 * Datos de una facultad registrados en el nodo catálogo central.
 */
export type Facultad = {
  id: string;
  name: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password: string;
  is_active: boolean;
};

// Se guarda el pool en globalThis para sobrevivir a las recargas en caliente del servidor de desarrollo
const globalCatalogo = globalThis as unknown as { __catalogPool?: Pool };

/**
 * Devuelve el pool de conexiones hacia el nodo catálogo central.
 */
export function getCatalogPool(): Pool {
  if (!globalCatalogo.__catalogPool) {
    globalCatalogo.__catalogPool = new Pool({
      connectionString:
        process.env.CATALOG_DATABASE_URL ??
        "postgres://postgres:root_password@localhost:5432/catalog_db",
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return globalCatalogo.__catalogPool;
}

/**
 * Lista todas las facultades registradas (activas e inactivas).
 */
export async function listarFacultades(soloActivas = false): Promise<Facultad[]> {
  // Marcar explícitamente la lectura como dinámica (datos en tiempo de petición)
  await connection();
  const { rows } = await getCatalogPool().query<Facultad>(
    `SELECT * FROM faculties ${soloActivas ? "WHERE is_active = true" : ""} ORDER BY name`
  );
  return rows;
}

/**
 * Obtiene una facultad por su slug, o null si no existe.
 */
export async function obtenerFacultad(slug: string): Promise<Facultad | null> {
  await connection();
  const { rows } = await getCatalogPool().query<Facultad>(
    "SELECT * FROM faculties WHERE id = $1",
    [slug]
  );
  return rows[0] ?? null;
}
