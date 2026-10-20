import { Suspense } from "react";
import { notFound } from "next/navigation";
import { obtenerFacultad } from "@/lib/db/catalog";
import { listarCarreras } from "@/lib/data";
import { Cargando, ErrorNodo, Migas, Rejilla, TarjetaEnlace, Titulo, Vacio } from "@/components/ui";

/**
 * Directorio de carreras de una facultad (consultado en su nodo).
 */
async function Contenido({ params }: { params: PageProps<"/[facultySlug]">["params"] }) {
  const { facultySlug } = await params;
  const facultad = await obtenerFacultad(facultySlug);
  if (!facultad) notFound();

  let carreras;
  try {
    carreras = await listarCarreras(facultySlug);
  } catch (e) {
    return <ErrorNodo error={e} />;
  }

  return (
    <>
      <Migas items={[{ href: "/", label: "Facultades" }, { label: facultad.name }]} />
      <Titulo sub="Carreras ofertadas">{facultad.name}</Titulo>
      {carreras.length === 0 ? (
        <Vacio>Sin carreras registradas.</Vacio>
      ) : (
        <Rejilla>
          {carreras.map((c) => (
            <TarjetaEnlace key={c.id} href={`/${facultySlug}/${c.id}`} titulo={c.name} sub={c.code} meta={`${c.total_grupos} grupo(s)`} />
          ))}
        </Rejilla>
      )}
    </>
  );
}

// 2. Dentro de una facultad: directorio de carreras
export default function Page(props: PageProps<"/[facultySlug]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido params={props.params} />
    </Suspense>
  );
}
