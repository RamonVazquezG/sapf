import { Rejilla, TarjetaEnlace, Titulo } from "@/components/ui";

// Portada del módulo administrativo (contenido estático)
export default function AdminHome() {
  return (
    <>
      <Titulo sub="Registra entidades y establece sus vínculos en cada nodo de facultad.">Administración</Titulo>
      <Rejilla>
        <TarjetaEnlace href="/admin/faculties" titulo="Facultades / Nodos" sub="Catálogo central y conexión a cada base de datos" />
        <TarjetaEnlace href="/admin/programs" titulo="Carreras" sub="Programas académicos por facultad" />
        <TarjetaEnlace href="/admin/groups" titulo="Grupos" sub="Grupos por carrera y periodo" />
        <TarjetaEnlace href="/admin/subjects" titulo="Materias" sub="Catálogo y asignación a grupos con profesor" />
        <TarjetaEnlace href="/admin/professors" titulo="Profesores" sub="Plantilla docente" />
        <TarjetaEnlace href="/admin/students" titulo="Alumnos" sub="Registro e inscripción a materias" />
      </Rejilla>
    </>
  );
}
