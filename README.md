# SAPF · Sistema de Asistencia Multi-Facultad

Next.js (App Router, Cache Components) + PostgreSQL distribuido: un **nodo catálogo** central y **un nodo por facultad**.

## Puesta en marcha

```bash
cp .env.example .env.local   # cadena de conexión al catálogo
pnpm install
pnpm db:up                   # levanta catálogo + nodos (docker compose)
pnpm db:migrate              # aplica db/faculty.sql en todos los nodos activos
pnpm db:seed                 # (opcional) datos de demostración
pnpm dev
```

## Estructura

| Ruta | Descripción |
| --- | --- |
| `db/catalog.sql`, `db/faculty.sql` | Esquemas del catálogo y de cada nodo (idempotentes) |
| `lib/db/catalog.ts` | Acceso al catálogo central |
| `lib/db/nodeResolver.ts` | Pool dinámico por facultad resuelto desde el catálogo |
| `lib/db/migrations.ts` | Migración de nodos nuevos y chequeo de salud |
| `lib/data.ts` | Consultas sobre los nodos de facultad |
| `app/actions/` | Acciones de servidor (administración y asistencia) |
| `app/[facultySlug]/[programId]/[groupId]/[subjectId]` | Navegación jerárquica, tablero, pase de lista y exportación CSV |
| `app/admin/*` | CRUD de facultades/nodos, carreras, grupos, materias, profesores y alumnos |
| `scripts/migrate.ts`, `scripts/seed.ts` | Migración orquestada y datos de ejemplo |

## Agregar una facultad nueva

1. Añade un servicio PostgreSQL en `docker-compose.yml` (p. ej. puerto `5435`) y ejecútalo.
2. En **Administración → Facultades / Nodos**, regístrala con sus datos de conexión: el esquema se aplica automáticamente.
