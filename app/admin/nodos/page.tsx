import { Suspense } from "react";
import { verificarSaludNodos } from "@/lib/db/migrations";
import { Cargando, ErrorNodo, Tabla, Titulo } from "@/components/ui";

/**
 * Ejecuta un chequeo de salud (SELECT 1) contra cada nodo de facultad.
 */
async function Estado() {
  let nodos;
  try {
    nodos = await verificarSaludNodos();
  } catch (e) {
    return <ErrorNodo error={e} />;
  }
  return (
    <Tabla cols={["Facultad", "Destino", "Estado", "Latencia"]}>
      {nodos.map((n) => (
        <tr key={n.id}>
          <td className="px-2 py-2">{n.name}</td>
          <td className="px-2 py-2 font-mono text-xs">{n.destino}</td>
          <td className="px-2 py-2">
            {n.ok ? <span className="text-emerald-600">● En línea</span> : <span className="text-red-600" title={n.error}>● {n.error}</span>}
          </td>
          <td className="px-2 py-2">{n.latenciaMs !== null ? `${n.latenciaMs} ms` : "—"}</td>
        </tr>
      ))}
    </Tabla>
  );
}

// Monitor de salud de los nodos distribuidos (Fase 6)
export default function Page() {
  return (
    <>
      <Titulo sub="Estado de conexión del catálogo hacia cada nodo de facultad. Recarga para volver a comprobar.">Salud de nodos</Titulo>
      <Suspense fallback={<Cargando />}>
        <Estado />
      </Suspense>
    </>
  );
}
