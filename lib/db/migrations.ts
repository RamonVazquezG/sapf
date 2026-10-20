import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { crearPoolParaFacultad, getFacultyDbPool } from "./nodeResolver";
import { listarFacultades, type Facultad } from "./catalog";

/**
 * Lee el esquema SQL idempotente que se replica en cada nodo de facultad.
 */
async function leerEsquemaFacultad(): Promise<string> {
  return readFile(path.join(process.cwd(), "db", "faculty.sql"), "utf8");
}

/**
 * Aplica (o re-aplica) el esquema de facultad sobre un nodo concreto.
 * Se usa al registrar una nueva facultad desde el panel administrativo.
 */
export async function migrarNodoFacultad(
  conexion: Pick<Facultad, "db_host" | "db_port" | "db_name" | "db_user" | "db_password">
): Promise<void> {
  const pool = crearPoolParaFacultad(conexion);
  try {
    await pool.query(await leerEsquemaFacultad());
  } finally {
    await pool.end();
  }
}

export type EstadoNodo = {
  id: string;
  name: string;
  destino: string;
  ok: boolean;
  latenciaMs: number | null;
  error?: string;
};

/**
 * Verifica la salud de cada nodo de facultad ejecutando un SELECT 1 con tiempo límite.
 */
export async function verificarSaludNodos(): Promise<EstadoNodo[]> {
  const facultades = await listarFacultades();
  return Promise.all(
    facultades.map(async (f): Promise<EstadoNodo> => {
      const destino = `${f.db_host}:${f.db_port}/${f.db_name}`;
      if (!f.is_active) return { id: f.id, name: f.name, destino, ok: false, latenciaMs: null, error: "Inactiva" };
      const inicio = Date.now();
      try {
        const pool = await getFacultyDbPool(f.id);
        await pool.query("SELECT 1");
        return { id: f.id, name: f.name, destino, ok: true, latenciaMs: Date.now() - inicio };
      } catch (e) {
        return { id: f.id, name: f.name, destino, ok: false, latenciaMs: null, error: (e as Error).message };
      }
    })
  );
}
