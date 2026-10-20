import { Suspense } from "react";
import { notFound } from "next/navigation";
import { obtenerFacultad } from "@/lib/db/catalog";
import { listarGrupos, obtenerCarrera } from "@/lib/data";
import { Cargando, ErrorNodo, Migas, Rejilla, TarjetaEnlace, Titulo, Vacio } from "@/components/ui";

type P = PageProps<"/[facultySlug]/[programId]">;

/**
 * Directorio de grupos de una carrera.
 */
async function Contenido({ params }: { params: P["params"] }) {
  const { facultySlug, programId } = await params;
  const facultad = await obtenerFacultad(facultySlug);
  if (!facultad) notFound();

  let carrera, grupos;
  try {
    carrera = await obtenerCarrera(facultySlug, programId);
    if (!carrera) notFound();
    grupos = await listarGrupos(facultySlug, programId);
  } catch (e) {
    if ((e as { digest?: string }).digest) throw e; // Propagar notFound()
    return <ErrorNodo error={e} />;
  }

  return (
    <>
      <Migas items={[{ href: "/", label: "Facultades" }, { href: `/${facultySlug}`, label: facultad.name }, { label: carrera.name }]} />
      <Titulo sub={`${carrera.code} · Grupos`}>{carrera.name}</Titulo>
      {grupos.length === 0 ? (
        <Vacio>Sin grupos registrados.</Vacio>
      ) : (
        <Rejilla>
          {grupos.map((g) => (
            <TarjetaEnlace key={g.id} href={`/${facultySlug}/${programId}/${g.id}`} titulo={g.code} sub={`Periodo ${g.academic_term}`} />
          ))}
        </Rejilla>
      )}
    </>
  );
}

// 3. Dentro de una carrera: directorio de grupos
export default function Page(props: P) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido params={props.params} />
    </Suspense>
  );
}
