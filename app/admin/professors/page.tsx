import { Suspense } from "react";
import { listarProfesores } from "@/lib/data";
import { crearProfesor } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { facultadSeleccionada, SelectorFacultad } from "@/components/admin";
import { BotonEliminar, Cargando, ErrorNodo, Panel, Tabla, Titulo, inputCls } from "@/components/ui";

/**
 * Formulario y listado de profesores del nodo seleccionado.
 */
async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/professors">["searchParams"] }) {
  const { facultades, actual } = await facultadSeleccionada(searchParams);
  const selector = <SelectorFacultad facultades={facultades} actual={actual} />;
  if (!actual) return selector;
  let datos;
  try {
    datos = await listarProfesores(actual.id);
  } catch (e) {
    return <>{selector}<ErrorNodo error={e} /></>;
  }
  const profesores = datos;
  return (
      <>
        <div className="mb-4">{selector}</div>
        <Panel titulo="Nuevo profesor">
          <ActionForm action={crearProfesor} className="flex flex-wrap items-end gap-2" boton="Registrar">
            <input type="hidden" name="facultad" value={actual.id} />
            <input name="employee_number" placeholder="No. empleado" required className={`${inputCls} w-32`} />
            <input name="first_name" placeholder="Nombre(s)" required className={inputCls} />
            <input name="last_name" placeholder="Apellidos" required className={inputCls} />
            <input name="email" type="email" placeholder="Correo" required className={inputCls} />
          </ActionForm>
        </Panel>
        <Panel titulo={`Profesores · ${actual.name}`}>
          <Tabla cols={["No. empleado", "Nombre", "Correo", ""]}>
            {profesores.map((p) => (
              <tr key={p.id}>
                <td className="px-2 py-2 font-mono text-xs">{p.employee_number}</td>
                <td className="px-2 py-2">{p.last_name}, {p.first_name}</td>
                <td className="px-2 py-2">{p.email}</td>
                <td className="px-2 py-2"><BotonEliminar facultad={actual.id} tipo="profesor" id={p.id} /></td>
              </tr>
            ))}
          </Tabla>
        </Panel>
      </>
  );
}

// Gestión de profesores
export default function Page(props: PageProps<"/admin/professors">) {
  return (
    <>
      <Titulo>Profesores</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
