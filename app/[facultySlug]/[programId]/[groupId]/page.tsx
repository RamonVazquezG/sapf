import { Suspense } from "react";
import { notFound } from "next/navigation";
import { obtenerFacultad } from "@/lib/db/catalog";
import { listarMateriasGrupo, obtenerGrupo } from "@/lib/data";
import { Cargando, ErrorNodo, Migas, Rejilla, TarjetaEnlace, Titulo, Vacio } from "@/components/ui";

type P = PageProps<"/[facultySlug]/[programId]/[groupId]">;

/**
 * Lista de materias del grupo con su profesor asignado.
 */
async function Contenido({ params }: { params: P["params"] }) {
  const { facultySlug, programId, groupId } = await params;
  const facultad = await obtenerFacultad(facultySlug);
  if (!facultad) notFound();

  let grupo, materias;
  try {
    grupo = await obtenerGrupo(facultySlug, groupId);
    if (!grupo || grupo.degree_program_id !== programId) notFound();
    materias = await listarMateriasGrupo(facultySlug, groupId);
  } catch (e) {
    if ((e as { digest?: string }).digest) throw e;
    return <ErrorNodo error={e} />;
  }

  return (
    <>
      <Migas
        items={[
          { href: "/", label: "Facultades" },
          { href: `/${facultySlug}`, label: facultad.name },
          { href: `/${facultySlug}/${programId}`, label: grupo.programa },
          { label: grupo.code },
        ]}
      />
      <Titulo sub={`Periodo ${grupo.academic_term} · Materias`}>Grupo {grupo.code}</Titulo>
      {materias.length === 0 ? (
        <Vacio>Sin materias asignadas a este grupo.</Vacio>
      ) : (
        <Rejilla>
          {materias.map((m) => (
            <TarjetaEnlace
              key={m.id}
              href={`/${facultySlug}/${programId}/${groupId}/${m.id}`}
              titulo={m.subject_name}
              sub={`${m.subject_code} · ${m.profesor ?? "Sin profesor asignado"}`}
              meta={[
                `${m.total_alumnos} alumno(s)`,
                ...(m.schedule_json ?? []).map((h) => `${h.day} ${h.start}–${h.end}`),
              ].join(" · ")}
            />
          ))}
        </Rejilla>
      )}
    </>
  );
}

// 4. Dentro de un grupo: materias con profesor asignado
export default function Page(props: P) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido params={props.params} />
    </Suspense>
  );
}
