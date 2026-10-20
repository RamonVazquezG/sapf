import { Suspense } from "react";
import { listarGrupos, listarMaterias, listarMateriasGrupo, listarProfesores } from "@/lib/data";
import { asignarMateria, crearMateria } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { facultadSeleccionada, SelectorFacultad } from "@/components/admin";
import { BotonEliminar, Cargando, ErrorNodo, Panel, Tabla, Titulo, inputCls } from "@/components/ui";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/**
 * Catálogo de materias y asignación materia → grupo → profesor.
 */
async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/subjects">["searchParams"] }) {
  const { facultades, actual } = await facultadSeleccionada(searchParams);
  const selector = <SelectorFacultad facultades={facultades} actual={actual} />;
  if (!actual) return selector;
  let datos;
  try {
    datos = await Promise.all([
      listarMaterias(actual.id),
      listarGrupos(actual.id),
      listarProfesores(actual.id),
      listarMateriasGrupo(actual.id),
    ]);
  } catch (e) {
    return <>{selector}<ErrorNodo error={e} /></>;
  }
  const [materias, grupos, profesores, asignaciones] = datos;
  return (
      <>
        <div className="mb-4">{selector}</div>
        <Panel titulo="Nueva materia">
          <ActionForm action={crearMateria} className="flex flex-wrap items-end gap-2" boton="Crear">
            <input type="hidden" name="facultad" value={actual.id} />
            <input name="code" placeholder="Clave (ej. CS101)" required className={`${inputCls} w-32`} />
            <input name="name" placeholder="Nombre" required className={`${inputCls} flex-1`} />
            <input name="credits" type="number" min={0} placeholder="Créditos" className={`${inputCls} w-24`} />
          </ActionForm>
        </Panel>

        <Panel titulo="Asignar materia a grupo (o cambiar profesor/horario)">
          {materias.length === 0 || grupos.length === 0 ? (
            <p className="text-sm text-zinc-500">Se necesitan al menos un grupo y una materia.</p>
          ) : (
            <ActionForm action={asignarMateria} className="flex flex-wrap items-end gap-2" boton="Asignar">
              <input type="hidden" name="facultad" value={actual.id} />
              <select name="group_id" required className={inputCls}>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.programa} · {g.code} ({g.academic_term})</option>)}
              </select>
              <select name="subject_id" required className={inputCls}>
                {materias.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.name}</option>)}
              </select>
              <select name="professor_id" className={inputCls}>
                <option value="">— Sin profesor —</option>
                {profesores.map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
              </select>
              <select name="day" className={inputCls}>
                <option value="">Día</option>
                {DIAS.map((d) => <option key={d}>{d}</option>)}
              </select>
              <input name="start" type="time" className={inputCls} />
              <input name="end" type="time" className={inputCls} />
            </ActionForm>
          )}
        </Panel>

        <Panel titulo="Asignaciones">
          <Tabla cols={["Grupo", "Materia", "Profesor", "Horario", "Alumnos", ""]}>
            {asignaciones.map((a) => (
              <tr key={a.id}>
                <td className="px-2 py-2">{a.programa} · {a.group_code}</td>
                <td className="px-2 py-2">{a.subject_code} · {a.subject_name}</td>
                <td className="px-2 py-2">{a.profesor ?? <span className="text-zinc-400">—</span>}</td>
                <td className="px-2 py-2 text-xs">{(a.schedule_json ?? []).map((h) => `${h.day} ${h.start}–${h.end}`).join(", ") || "—"}</td>
                <td className="px-2 py-2">{a.total_alumnos}</td>
                <td className="px-2 py-2"><BotonEliminar facultad={actual.id} tipo="asignacion" id={a.id} /></td>
              </tr>
            ))}
          </Tabla>
        </Panel>

        <Panel titulo={`Catálogo de materias · ${actual.name}`}>
          <Tabla cols={["Clave", "Nombre", "Créditos", ""]}>
            {materias.map((m) => (
              <tr key={m.id}>
                <td className="px-2 py-2 font-mono text-xs">{m.code}</td>
                <td className="px-2 py-2">{m.name}</td>
                <td className="px-2 py-2">{m.credits}</td>
                <td className="px-2 py-2"><BotonEliminar facultad={actual.id} tipo="materia" id={m.id} /></td>
              </tr>
            ))}
          </Tabla>
        </Panel>
      </>
  );
}

// Gestión de materias y asignaciones
export default function Page(props: PageProps<"/admin/subjects">) {
  return (
    <>
      <Titulo>Materias y asignaciones</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
