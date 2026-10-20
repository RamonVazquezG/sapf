import { Suspense } from "react";
import { listarFacultades } from "@/lib/db/catalog";
import { alternarFacultad, crearFacultad, eliminarFacultad } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { Cargando, ErrorNodo, Panel, Tabla, Titulo, inputCls } from "@/components/ui";

/**
 * Tabla de facultades registradas en el catálogo central.
 */
async function ListaFacultades() {
  let facultades;
  try {
    facultades = await listarFacultades();
  } catch (e) {
    return <ErrorNodo error={e} />;
  }
  return (
    <Tabla cols={["Slug", "Nombre", "Nodo", "Estado", ""]}>
      {facultades.map((f) => (
        <tr key={f.id}>
          <td className="px-2 py-2 font-mono text-xs">{f.id}</td>
          <td className="px-2 py-2">{f.name}</td>
          <td className="px-2 py-2 font-mono text-xs">{f.db_user}@{f.db_host}:{f.db_port}/{f.db_name}</td>
          <td className="px-2 py-2">{f.is_active ? <span className="text-emerald-600">Activa</span> : <span className="text-zinc-400">Inactiva</span>}</td>
          <td className="flex gap-1 px-2 py-2">
            <ActionForm action={alternarFacultad} boton={f.is_active ? "Desactivar" : "Activar"} variante="suave">
              <input type="hidden" name="id" value={f.id} />
            </ActionForm>
            <ActionForm action={eliminarFacultad} boton="Eliminar" variante="peligro" confirmar="Se eliminará la facultad del catálogo (los datos del nodo se conservan). ¿Continuar?">
              <input type="hidden" name="id" value={f.id} />
            </ActionForm>
          </td>
        </tr>
      ))}
    </Tabla>
  );
}

// Registro de facultades y sus nodos de base de datos
export default function Page() {
  return (
    <>
      <Titulo sub="Cada facultad apunta a su propio nodo PostgreSQL. Al registrarla se aplica automáticamente el esquema.">Facultades / Nodos</Titulo>
      <Panel titulo="Registrar facultad">
        <ActionForm action={crearFacultad} className="flex flex-wrap items-end gap-2" boton="Registrar y migrar">
          <input name="id" placeholder="slug (ej. derecho)" required className={inputCls} />
          <input name="name" placeholder="Facultad de Derecho" required className={inputCls} />
          <input name="db_host" placeholder="Host" defaultValue="localhost" required className={inputCls} />
          <input name="db_port" type="number" placeholder="Puerto" defaultValue={5435} required className={`${inputCls} w-24`} />
          <input name="db_name" placeholder="Base de datos" required className={inputCls} />
          <input name="db_user" placeholder="Usuario" defaultValue="postgres" required className={inputCls} />
          <input name="db_password" type="password" placeholder="Contraseña" className={inputCls} />
        </ActionForm>
      </Panel>
      <Panel titulo="Facultades registradas">
        <Suspense fallback={<Cargando />}>
          <ListaFacultades />
        </Suspense>
      </Panel>
    </>
  );
}
