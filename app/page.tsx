import { Suspense } from "react";
import { listarFacultades } from "@/lib/db/catalog";
import { Cargando, ErrorNodo, Rejilla, TarjetaEnlace, Titulo, Vacio } from "@/components/ui";

/**
 * Lista de facultades activas consultada en el catálogo central (contenido dinámico).
 */
async function ListaFacultades() {
  let facultades;
  try {
    facultades = await listarFacultades(true);
  } catch (e) {
    return <ErrorNodo error={e} />;
  }
  if (facultades.length === 0) return <Vacio>No hay facultades registradas. Regístralas en Administración.</Vacio>;
  return (
    <Rejilla>
      {facultades.map((f) => (
        <TarjetaEnlace key={f.id} href={`/${f.id}`} titulo={f.name} meta={`Nodo: ${f.db_host}:${f.db_port}/${f.db_name}`} />
      ))}
    </Rejilla>
  );
}

// 1. Página de inicio: selector de facultad
export default function Home() {
  return (
    <>
      <Titulo sub="Selecciona una facultad para navegar a sus carreras, grupos y materias.">Facultades</Titulo>
      <Suspense fallback={<Cargando />}>
        <ListaFacultades />
      </Suspense>
    </>
  );
}
