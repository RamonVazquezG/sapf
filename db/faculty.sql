-- Esquema replicado en cada nodo de facultad.
-- Es idempotente: puede ejecutarse varias veces (lo usa también scripts/migrate.ts).

-- 1. Carreras (Degree Programs)
CREATE TABLE IF NOT EXISTS degree_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Profesores
CREATE TABLE IF NOT EXISTS professors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_number VARCHAR(64) UNIQUE NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Grupos
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    degree_program_id UUID NOT NULL REFERENCES degree_programs(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    academic_term VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Materias
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Materias asignadas a grupos y profesores
CREATE TABLE IF NOT EXISTS group_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
    schedule_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, subject_id)
);

-- 6. Alumnos
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_number VARCHAR(64) UNIQUE NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Inscripciones de alumnos en materias de grupo
CREATE TABLE IF NOT EXISTS student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_subject_id UUID NOT NULL REFERENCES group_subjects(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, group_subject_id)
);

-- 8. Sesiones de asistencia (una por materia-grupo y fecha)
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_subject_id UUID NOT NULL REFERENCES group_subjects(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_subject_id, session_date)
);

-- Firma de cierre de sesión por parte del profesor (Fase 5)
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS signed_off_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS signed_off_by UUID REFERENCES professors(id) ON DELETE SET NULL;

-- Tipo enumerado de estados de asistencia (creado sólo si no existe)
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('PRESENTE', 'AUSENTE', 'RETARDO', 'JUSTIFICADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Registros de asistencia
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'AUSENTE',
    remarks TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);
