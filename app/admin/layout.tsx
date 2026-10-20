import Link from "next/link";

// Secciones del módulo administrativo
const SECCIONES = [
  { href: "/admin/faculties", label: "Facultades / Nodos" },
  { href: "/admin/programs", label: "Carreras" },
  { href: "/admin/groups", label: "Grupos" },
  { href: "/admin/subjects", label: "Materias y asignaciones" },
  { href: "/admin/professors", label: "Profesores" },
  { href: "/admin/students", label: "Alumnos e inscripciones" },
  { href: "/admin/nodos", label: "Salud de nodos" },
];

// Diseño del panel administrativo con menú lateral
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Administración</h2>
        <nav className="flex flex-wrap gap-1 md:flex-col">
          {SECCIONES.map((s) => (
            <Link key={s.href} href={s.href} className="rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900">
              {s.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
