import "server-only";
import { Pool } from "pg";
import { obtenerFacultad, type Facultad } from "./catalog";

// Registro en memoria de las conexiones activas por cada facultad (pool distribuido).
// Se aloja en globalThis para no duplicar pools con la recarga en caliente.
const globalNodos = globalThis as unknown as {
  __facultyPools?: Map<string, { pool: Pool; firma: string }>;
};
const connectionPools = (globalNodos.__facultyPools ??= new Map());

/**
 * Construye una firma de la configuración de conexión para detectar cambios en el catálogo.
 */
function firmaConexion(f: Facultad): string {
  return `${f.db_host}:${f.db_port}/${f.db_name}@${f.db_user}`;
}

/**
 * Crea un pool directamente a partir de los datos de conexión de una facultad.
 */
export function crearPoolParaFacultad(f: Pick<Facultad, "db_host" | "db_port" | "db_name" | "db_user" | "db_password">): Pool {
  return new Pool({
    host: f.db_host,
    port: f.db_port,
    database: f.db_name,
    user: f.db_user,
    password: f.db_password,
    max: 10, // Límite máximo de conexiones por nodo
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

/**
 * Obtiene o inicializa el pool de conexiones para una facultad específica.
 * La configuración del nodo se resuelve desde el catálogo central.
 * @param facultySlug - Identificador único de la facultad (ej. 'ingenieria', 'medicina')
 * @returns Instancia de Pool de PostgreSQL configurada para el nodo correspondiente
 */
export async function getFacultyDbPool(facultySlug: string): Promise<Pool> {
  // 1. Consultar la configuración del nodo en el catálogo central
  const facultad = await obtenerFacultad(facultySlug);
  if (!facultad) throw new Error(`La facultad "${facultySlug}" no está registrada en el catálogo`);
  if (!facultad.is_active) throw new Error(`La facultad "${facultySlug}" está inactiva`);

  // 2. Reutilizar el pool en caché si la configuración no ha cambiado
  const firma = firmaConexion(facultad);
  const existente = connectionPools.get(facultySlug);
  if (existente && existente.firma === firma) return existente.pool;

  // 3. Si la configuración cambió, cerrar el pool anterior y crear uno nuevo
  if (existente) await existente.pool.end().catch(() => {});
  const pool = crearPoolParaFacultad(facultad);
  connectionPools.set(facultySlug, { pool, firma });
  return pool;
}

/**
 * Cierra y elimina de la caché el pool de una facultad (útil al editar o borrar nodos).
 */
export async function invalidarPoolFacultad(facultySlug: string): Promise<void> {
  const existente = connectionPools.get(facultySlug);
  if (existente) {
    connectionPools.delete(facultySlug);
    await existente.pool.end().catch(() => {});
  }
}
