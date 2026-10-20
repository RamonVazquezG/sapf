import { Suspense } from "react";
import { listarAlumnos, listarMateriasGrupo, q } from "@/lib/data";
import { crearAlumno, inscribirAlumnos } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { facultadSeleccionada, SelectorFacultad } from "@/components/admin";
import { BotonEliminar, Cargando, ErrorNodo, Panel, Tabla, Titulo, inputCls } from "@/components/ui";

/**
 * Registro de alumnos, inscripción a materias-grupo y listado de inscripciones.
 */
async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/students">["searchParams"] }) {
  const { facultades, actual } = await facultadSeleccionada(searchParams);
  const selector = <SelectorFacultad facultades={facultades} actual={actual} />;
  if (!actual) return selector;
  let datos;
  try {
    datos = await Promise.all([
      listarAlumnos(actual.id),
      listarMateriasGrupo(actual.id),
      // Inscripciones agrupadas por alumno para mostrarlas en la tabla
      q<{ id: string; student_id: string; etiqueta: string }>(
        actual.id,
        `SELECT se.id, se.student_id, g.code || ' · ' || s.code AS etiqueta
           FROM student_enrollments se
           JOIN group_subjects gs ON gs.id = se.group_subject_id
           JOIN groups g ON g.id = gs.group_id
           JOIN subjects s ON s.id = gs.subject_id
          ORDER BY g.code, s.code`
      ),
    ]);
  } catch (e) {
    return <>{selector}<ErrorNodo error={e} /></>;
  }
  const [alumnos, asignaciones, inscripciones] = datos;
    const porAlumno = new Map<string, typeof inscripciones>();
    for (const i of inscripciones) porAlumno.set(i.student_id, [...(porAlumno.get(i.student_id) ?? []), i]);

  return (
      <>
        <div className="mb-4">{selector}</div>
        <Panel titulo="Nuevo alumno">
          <ActionForm action={crearAlumno} className="flex flex-wrap items-end gap-2" boton="Registrar">
            <input type="hidden" name="facultad" value={actual.id} />
            <input name="enrollment_number" placeholder="Matrícula" required className={`${inputCls} w-32`} />
            <input name="first_name" placeholder="Nombre(s)" required className={inputCls} />
            <input name="last_name" placeholder="Apellidos" required className={inputCls} />
            <input name="email" type="email" placeholder="Correo" required className={inputCls} />
          </ActionForm>
        </Panel>

        <Panel titulo="Inscribir alumnos en materia">
          {alumnos.length === 0 || asignaciones.length === 0 ? (
            <p className="text-sm text-zinc-500">Se necesitan alumnos y materias asignadas a grupos.</p>
          ) : (
            <ActionForm action={inscribirAlumnos} className="flex flex-col items-start gap-2" boton="Inscribir">
              <input type="hidden" name="facultad" value={actual.id} />
              <select name="group_subject_id" required className={inputCls}>
                {asignaciones.map((a) => (
                  <option key={a.id} value={a.id}>{a.programa} · Grupo {a.group_code} · {a.subject_code} {a.subject_name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="todo_grupo" /> Inscribir en todas las materias de ese grupo
              </label>
              <select name="student_id" multiple required size={Math.min(8, alumnos.length)} className={`${inputCls} w-full max-w-md`}>
                {alumnos.map((a) => <option key={a.id} value={a.id}>{a.enrollment_number} · {a.last_name}, {a.first_name}</option>)}
              </select>
              <p className="text-xs text-zinc-500">Usa Ctrl/Cmd o Shift para seleccionar varios alumnos.</p>
            </ActionForm>
          )}
        </Panel>

        <Panel titulo={`Alumnos · ${actual.name}`}>
          <Tabla cols={["Matrícula", "Nombre", "Correo", "Inscripciones", ""]}>
            {alumnos.map((a) => (
              <tr key={a.id}>
                <td className="px-2 py-2 font-mono text-xs">{a.enrollment_number}</td>
                <td className="px-2 py-2">{a.last_name}, {a.first_name}</td>
                <td className="px-2 py-2">{a.email}</td>
                <td className="px-2 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(porAlumno.get(a.id) ?? []).map((i) => (
                      <span key={i.id} className="flex items-center rounded bg-zinc-100 pl-2 text-xs dark:bg-zinc-800">
                        {i.etiqueta}
                        <BotonEliminar facultad={actual.id} tipo="inscripcion" id={i.id} />
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-2"><BotonEliminar facultad={actual.id} tipo="alumno" id={a.id} /></td>
              </tr>
            ))}
          </Tabla>
        </Panel>
      </>
  );
}

// Gestión de alumnos e inscripciones
export default function Page(props: PageProps<"/admin/students">) {
  return (
    <>
      <Titulo>Alumnos e inscripciones</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
