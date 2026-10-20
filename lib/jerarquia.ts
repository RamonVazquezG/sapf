import "server-only";
import { notFound } from "next/navigation";
import { obtenerFacultad } from "@/lib/db/catalog";
import { obtenerMateriaGrupo } from "@/lib/data";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resuelve y valida la jerarquía facultad → carrera → grupo → materia de una URL.
 * Lanza notFound() si algún eslabón no existe o no corresponde con su padre.
 */
export async function resolverMateria(p: { facultySlug: string; programId: string; groupId: string; subjectId: string }) {
  if (![p.programId, p.groupId, p.subjectId].every((x) => UUID.test(x))) notFound();
  const facultad = await obtenerFacultad(p.facultySlug);
  if (!facultad) notFound();
  const materia = await obtenerMateriaGrupo(p.facultySlug, p.subjectId);
  if (!materia || materia.group_id !== p.groupId || materia.degree_program_id !== p.programId) notFound();
  const base = `/${p.facultySlug}/${p.programId}/${p.groupId}/${p.subjectId}`;
  return { facultad, materia, base };
}
