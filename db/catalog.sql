-- Esquema del nodo catálogo central (plano de control).
-- Registra cada facultad y los datos de conexión de su nodo PostgreSQL.
CREATE TABLE IF NOT EXISTS faculties (
    id VARCHAR(64) PRIMARY KEY,       -- slug, ej. "ingenieria", "medicina"
    name VARCHAR(255) NOT NULL,       -- "Facultad de Ingeniería"
    db_host VARCHAR(255) NOT NULL,    -- Host de la base de datos dockerizada
    db_port INT DEFAULT 5432,
    db_name VARCHAR(128) NOT NULL,
    db_user VARCHAR(128) NOT NULL,
    db_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Semilla inicial: nodos levantados por docker-compose (puertos mapeados al host)
INSERT INTO faculties (id, name, db_host, db_port, db_name, db_user, db_password) VALUES
    ('ingenieria', 'Facultad de Ingeniería', 'localhost', 5433, 'faculty_ingenieria_db', 'postgres', 'postgres_password'),
    ('medicina', 'Facultad de Medicina', 'localhost', 5434, 'faculty_medicina_db', 'postgres', 'postgres_password')
ON CONFLICT (id) DO NOTHING;
