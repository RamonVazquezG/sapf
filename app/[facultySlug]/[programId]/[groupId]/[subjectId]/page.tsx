import { Suspense } from "react";
import Link from "next/link";
import { listarSesiones, resumenPorAlumno } from "@/lib/data";
import { resolverMateria } from "@/lib/jerarquia";
import { firmarSesion } from "@/app/actions/asistencia";
import { ActionForm } from "@/components/ActionForm";
import { Cargando, Migas, Panel, Tabla, Titulo, Vacio } from "@/components/ui";

type P = PageProps<"/[facultySlug]/[programId]/[groupId]/[subjectId]">;

/** Colorea el porcentaje según el umbral mínimo de asistencia (80%). */
function Porcentaje({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-zinc-400">—</span>;
  const color = valor >= 80 ? "text-emerald-600" : valor >= 60 ? "text-amber-600" : "text-red-600";
  return <span className={`font-medium ${color}`}>{valor}%</span>;
}

/**
 * Tablero de asistencia de una materia: porcentajes por alumno e historial de sesiones.
 */
async function Contenido({ params }: { params: P["params"] }) {
  const p = await params;
  const { facultad, materia, base } = await resolverMateria(p);
  const [resumen, sesiones] = await Promise.all([
    resumenPorAlumno(p.facultySlug, materia.id),
    listarSesiones(p.facultySlug, materia.id),
  ]);
  const conDatos = resumen.filter((r) => r.porcentaje !== null);
  const promedio = conDatos.length
    ? Math.round((conDatos.reduce((s, r) => s + (r.porcentaje ?? 0), 0) / conDatos.length) * 10) / 10
    : null;

  return (
    <>
      <Migas
        items={[
          { href: "/", label: "Facultades" },
          { href: `/${p.facultySlug}`, label: facultad.name },
          { href: `/${p.facultySlug}/${p.programId}`, label: materia.programa },
          { href: `/${p.facultySlug}/${p.programId}/${p.groupId}`, label: materia.group_code },
          { label: materia.subject_name },
        ]}
      />
      <Titulo
        sub={`${materia.subject_code} · Grupo ${materia.group_code} · ${materia.profesor ?? "Sin profesor asignado"}`}
        extra={
          <div className="flex gap-2">
            <a href={`${base}/export`} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Exportar CSV
            </a>
            <Link href={`${base}/take-attendance`} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">
              Pasar lista
            </Link>
          </div>
        }
      >
        {materia.subject_name}
      </Titulo>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Alumnos inscritos", resumen.length],
          ["Sesiones registradas", sesiones.length],
          ["Asistencia promedio", promedio === null ? "—" : `${promedio}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-xs text-zinc-500">{k}</div>
            <div className="text-2xl font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <Panel titulo="Asistencia por alumno">
        {resumen.length === 0 ? (
          <Vacio>No hay alumnos inscritos en esta materia.</Vacio>
        ) : (
          <Tabla cols={["Matrícula", "Alumno", "Presente", "Retardo", "Justificado", "Ausente", "Asistencia"]}>
            {resumen.map((r) => (
              <tr key={r.id}>
                <td className="px-2 py-2 font-mono text-xs">{r.enrollment_number}</td>
                <td className="px-2 py-2">{r.last_name}, {r.first_name}</td>
                <td className="px-2 py-2">{r.presentes}</td>
                <td className="px-2 py-2">{r.retardos}</td>
                <td className="px-2 py-2">{r.justificados}</td>
                <td className="px-2 py-2">{r.ausentes}</td>
                <td className="px-2 py-2"><Porcentaje valor={r.porcentaje} /></td>
              </tr>
            ))}
          </Tabla>
        )}
      </Panel>

      <Panel titulo="Historial de sesiones">
        {sesiones.length === 0 ? (
          <Vacio>Aún no se ha pasado lista.</Vacio>
        ) : (
          <Tabla cols={["Fecha", "P", "R", "J", "A", "Firma", ""]}>
            {sesiones.map((s) => (
              <tr key={s.id}>
                <td className="px-2 py-2">
                  <Link href={`${base}/take-attendance?fecha=${s.session_date}`} className="text-indigo-600 hover:underline">
                    {s.session_date}
                  </Link>
                </td>
                <td className="px-2 py-2">{s.presentes}</td>
                <td className="px-2 py-2">{s.retardos}</td>
                <td className="px-2 py-2">{s.justificados}</td>
                <td className="px-2 py-2">{s.ausentes}</td>
                <td className="px-2 py-2 text-xs text-zinc-500">
                  {s.signed_off_at
                    ? `Firmada ${new Date(s.signed_off_at).toLocaleString("es-MX")}${s.firmante ? ` por ${s.firmante}` : ""}`
                    : "Pendiente"}
                </td>
                <td className="px-2 py-2">
                  {!s.signed_off_at && (
                    <ActionForm action={firmarSesion} boton="Firmar" variante="suave" confirmar="Al firmar, la sesión ya no podrá modificarse. ¿Continuar?">
                      <input type="hidden" name="facultad" value={p.facultySlug} />
                      <input type="hidden" name="session_id" value={s.id} />
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Panel>
    </>
  );
}

// 5. Dentro de una materia: tablero de asistencia
export default function Page(props: P) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido params={props.params} />
    </Suspense>
  );
}
