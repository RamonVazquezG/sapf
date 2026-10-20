import { Suspense } from "react";
import { listarCarreras, listarGrupos } from "@/lib/data";
import { crearGrupo } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { facultadSeleccionada, SelectorFacultad } from "@/components/admin";
import { BotonEliminar, Cargando, ErrorNodo, Panel, Tabla, Titulo, inputCls } from "@/components/ui";

/**
 * Formulario y listado de grupos del nodo seleccionado.
 */
async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/groups">["searchParams"] }) {
  const { facultades, actual } = await facultadSeleccionada(searchParams);
  const selector = <SelectorFacultad facultades={facultades} actual={actual} />;
  if (!actual) return selector;
  let datos;
  try {
    datos = await Promise.all([listarCarreras(actual.id), listarGrupos(actual.id)]);
  } catch (e) {
    return <>{selector}<ErrorNodo error={e} /></>;
  }
  const [carreras, grupos] = datos;
  return (
      <>
        <div className="mb-4">{selector}</div>
        <Panel titulo="Nuevo grupo">
          {carreras.length === 0 ? (
            <p className="text-sm text-zinc-500">Primero registra una carrera.</p>
          ) : (
            <ActionForm action={crearGrupo} className="flex flex-wrap items-end gap-2" boton="Crear">
              <input type="hidden" name="facultad" value={actual.id} />
              <select name="degree_program_id" required className={inputCls}>
                {carreras.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
              </select>
              <input name="code" placeholder="Grupo (ej. 601)" required className={`${inputCls} w-32`} />
              <input name="academic_term" placeholder="Periodo (ej. 2026-2)" required className={`${inputCls} w-36`} />
            </ActionForm>
          )}
        </Panel>
        <Panel titulo={`Grupos · ${actual.name}`}>
          <Tabla cols={["Carrera", "Grupo", "Periodo", ""]}>
            {grupos.map((g) => (
              <tr key={g.id}>
                <td className="px-2 py-2">{g.programa}</td>
                <td className="px-2 py-2">{g.code}</td>
                <td className="px-2 py-2">{g.academic_term}</td>
                <td className="px-2 py-2"><BotonEliminar facultad={actual.id} tipo="grupo" id={g.id} /></td>
              </tr>
            ))}
          </Tabla>
        </Panel>
      </>
  );
}

// Gestión de grupos
export default function Page(props: PageProps<"/admin/groups">) {
  return (
    <>
      <Titulo>Grupos</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
