import { Suspense } from "react";
import { listarCarreras } from "@/lib/data";
import { crearCarrera } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { facultadSeleccionada, SelectorFacultad } from "@/components/admin";
import { BotonEliminar, Cargando, ErrorNodo, Panel, Tabla, Titulo, inputCls } from "@/components/ui";

/**
 * Formulario y listado de carreras del nodo seleccionado.
 */
async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/programs">["searchParams"] }) {
  const { facultades, actual } = await facultadSeleccionada(searchParams);
  const selector = <SelectorFacultad facultades={facultades} actual={actual} />;
  if (!actual) return selector;
  let datos;
  try {
    datos = await listarCarreras(actual.id);
  } catch (e) {
    return <>{selector}<ErrorNodo error={e} /></>;
  }
  const carreras = datos;
  return (
      <>
        <div className="mb-4">{selector}</div>
        <Panel titulo="Nueva carrera">
          <ActionForm action={crearCarrera} className="flex flex-wrap items-end gap-2" boton="Crear">
            <input type="hidden" name="facultad" value={actual.id} />
            <input name="code" placeholder="Clave (ej. ISC)" required className={`${inputCls} w-32`} />
            <input name="name" placeholder="Nombre de la carrera" required className={`${inputCls} flex-1`} />
          </ActionForm>
        </Panel>
        <Panel titulo={`Carreras · ${actual.name}`}>
          <Tabla cols={["Clave", "Nombre", "Grupos", ""]}>
            {carreras.map((c) => (
              <tr key={c.id}>
                <td className="px-2 py-2 font-mono text-xs">{c.code}</td>
                <td className="px-2 py-2">{c.name}</td>
                <td className="px-2 py-2">{c.total_grupos}</td>
                <td className="px-2 py-2"><BotonEliminar facultad={actual.id} tipo="carrera" id={c.id} /></td>
              </tr>
            ))}
          </Tabla>
        </Panel>
      </>
  );
}

// Gestión de carreras
export default function Page(props: PageProps<"/admin/programs">) {
  return (
    <>
      <Titulo>Carreras</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
