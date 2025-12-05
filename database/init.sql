-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    grado VARCHAR(50) NOT NULL,
    grupo VARCHAR(50) NOT NULL,
    correo_institucional VARCHAR(255) UNIQUE NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_responses table
CREATE TABLE IF NOT EXISTS user_responses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(255) NOT NULL,
    pregunta_id INTEGER NOT NULL,
    pregunta_texto TEXT NOT NULL,
    respuesta_usuario TEXT NOT NULL,
    respuesta_correcta TEXT NOT NULL,
    es_correcta BOOLEAN NOT NULL,
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- Insert default admin user (password: mejia1234)
-- Note: Password is checked directly in the app for simplicity
-- In production, use proper password hashing
INSERT INTO admin_users (username, password_hash) 
VALUES ('GibranAdmin', 'mejia1234')
ON CONFLICT (username) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_responses_user_id ON user_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_fecha ON user_responses(fecha_respuesta);
CREATE INDEX IF NOT EXISTS idx_users_correo ON users(correo_institucional);

