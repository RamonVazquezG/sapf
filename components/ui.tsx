import Link from "next/link";
import { eliminarRegistro } from "@/app/actions/admin";
import { ActionForm } from "./ActionForm";

// Componentes de interfaz reutilizables (servidor).

/** Clase base para inputs y selects. */
export const inputCls =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

/** Migas de pan para la navegación jerárquica. */
export function Migas({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-zinc-500">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span>/</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-indigo-600 hover:underline">
              {it.label}
            </Link>
          ) : (
            <span className="text-zinc-800 dark:text-zinc-200">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Título de página con subtítulo opcional y acciones a la derecha. */
export function Titulo({ children, sub, extra }: { children: React.ReactNode; sub?: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{children}</h1>
        {sub && <p className="text-sm text-zinc-500">{sub}</p>}
      </div>
      {extra}
    </div>
  );
}

/** Tarjeta enlazada usada en los directorios de navegación. */
export function TarjetaEnlace({ href, titulo, sub, meta }: { href: string; titulo: string; sub?: string; meta?: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-zinc-200 p-4 transition hover:border-indigo-400 hover:shadow-sm dark:border-zinc-800"
    >
      <div className="font-medium">{titulo}</div>
      {sub && <div className="text-sm text-zinc-500">{sub}</div>}
      {meta && <div className="mt-2 text-xs text-zinc-400">{meta}</div>}
    </Link>
  );
}

/** Rejilla para tarjetas. */
export function Rejilla({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

/** Mensaje para listas vacías. */
export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">{children}</p>;
}

/** Panel con título, usado en las páginas de administración. */
export function Panel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 font-medium">{titulo}</h2>
      {children}
    </section>
  );
}

/** Tabla simple con encabezados. */
export function Tabla({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
          <tr>{cols.map((c) => <th key={c} className="px-2 py-2 font-medium">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">{children}</tbody>
      </table>
    </div>
  );
}

/** Botón de eliminación genérico para registros de un nodo de facultad. */
export function BotonEliminar({ facultad, tipo, id }: { facultad: string; tipo: string; id: string }) {
  return (
    <ActionForm action={eliminarRegistro} boton="Eliminar" variante="peligro" confirmar="¿Eliminar este registro? Se borrarán también sus datos dependientes.">
      <input type="hidden" name="facultad" value={facultad} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={id} />
    </ActionForm>
  );
}

/** Mensaje de error cuando un nodo de facultad no responde. */
export function ErrorNodo({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      No se pudo consultar el nodo de la facultad: {(error as Error).message}
    </div>
  );
}

/** Indicador de carga para los límites de Suspense. */
export function Cargando() {
  return <p className="animate-pulse text-sm text-zinc-500">Cargando…</p>;
}
