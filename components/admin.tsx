import "server-only";
import Link from "next/link";
import { listarFacultades, type Facultad } from "@/lib/db/catalog";
import { inputCls } from "./ui";

/**
 * Determina la facultad activa del panel administrativo a partir de ?f=slug.
 * Si no se indica, se usa la primera facultad activa.
 */
export async function facultadSeleccionada(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const sp = await searchParams;
  const facultades = await listarFacultades(true);
  const actual = facultades.find((f) => f.id === sp.f) ?? facultades[0] ?? null;
  return { facultades, actual, sp };
}

/**
 * Selector de facultad (formulario GET) mostrado en la cabecera de cada página de administración.
 */
export function SelectorFacultad({ facultades, actual }: { facultades: Facultad[]; actual: Facultad | null }) {
  if (!actual)
    return (
      <p className="text-sm text-zinc-500">
        No hay facultades activas. <Link href="/admin/faculties" className="text-indigo-600 underline">Registrar una</Link>
      </p>
    );
  return (
    <form className="flex items-center gap-2 text-sm">
      <label htmlFor="f" className="text-zinc-500">Nodo:</label>
      <select id="f" name="f" defaultValue={actual.id} className={inputCls}>
        {facultades.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
      <button className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Cambiar</button>
    </form>
  );
}
