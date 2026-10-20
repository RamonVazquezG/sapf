import { Suspense } from "react";
import Link from "next/link";
import { listarInscritos, obtenerSesionPorFecha } from "@/lib/data";
import { resolverMateria } from "@/lib/jerarquia";
import { Cargando, Migas, Titulo, Vacio, inputCls } from "@/components/ui";
import { HojaAsistencia } from "./HojaAsistencia";

type P = PageProps<"/[facultySlug]/[programId]/[groupId]/[subjectId]/take-attendance">;

/** Fecha local de hoy en formato YYYY-MM-DD. */
function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Carga la sesión del día elegido y los alumnos inscritos para la hoja de pase de lista.
 */
async function Contenido({ params, searchParams }: { params: P["params"]; searchParams: P["searchParams"] }) {
  const p = await params;
  const sp = await searchParams;
  const fechaParam = typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : null;
  const fecha = fechaParam ?? hoy();

  const { facultad, materia, base } = await resolverMateria(p);
  const [alumnos, { sesion, registros }] = await Promise.all([
    listarInscritos(p.facultySlug, materia.id),
    obtenerSesionPorFecha(p.facultySlug, materia.id, fecha),
  ]);

  return (
    <>
      <Migas
        items={[
          { href: "/", label: "Facultades" },
          { href: `/${p.facultySlug}`, label: facultad.name },
          { href: `/${p.facultySlug}/${p.programId}`, label: materia.programa },
          { href: `/${p.facultySlug}/${p.programId}/${p.groupId}`, label: materia.group_code },
          { href: base, label: materia.subject_name },
          { label: "Pase de lista" },
        ]}
      />
      <Titulo
        sub={`${materia.subject_name} · Grupo ${materia.group_code}`}
        extra={
          // Selector de fecha: formulario GET que recarga la página con ?fecha=
          <form className="flex items-center gap-2">
            <input type="date" name="fecha" defaultValue={fecha} className={inputCls} />
            <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Ir
            </button>
          </form>
        }
      >
        Pase de lista · {fecha}
      </Titulo>
      {alumnos.length === 0 ? (
        <Vacio>
          No hay alumnos inscritos. <Link className="text-indigo-600 underline" href={`/admin/students?f=${p.facultySlug}`}>Inscribir alumnos</Link>
        </Vacio>
      ) : (
        <HojaAsistencia
          key={fecha}
          facultad={p.facultySlug}
          materiaGrupoId={materia.id}
          fecha={fecha}
          alumnos={alumnos}
          iniciales={Object.fromEntries(registros.map((r) => [r.student_id, { status: r.status, remarks: r.remarks ?? "" }]))}
          existe={!!sesion}
          firmada={!!sesion?.signed_off_at}
          volver={base}
        />
      )}
    </>
  );
}

// Hoja dinámica de pase de lista diario
export default function Page(props: P) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
