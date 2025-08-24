-- Crear tabla de usuarios si no existe
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'aprendiz',
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Agregar comentarios a la tabla y columnas
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema PokéCollector';
COMMENT ON COLUMN users.id IS 'ID único del usuario (UUID)';
COMMENT ON COLUMN users.email IS 'Email del usuario (único)';
COMMENT ON COLUMN users.plan_type IS 'Tipo de plan de suscripción (aprendiz, coleccionista, maestro)';
COMMENT ON COLUMN users.stripe_customer_id IS 'ID del cliente en Stripe';
COMMENT ON COLUMN users.stripe_subscription_id IS 'ID de la suscripción en Stripe';
COMMENT ON COLUMN users.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN users.updated_at IS 'Fecha de última actualización del registro';

-- Insertar usuario de ejemplo para pruebas (opcional)
-- INSERT INTO users (email, plan_type) VALUES ('test@example.com', 'aprendiz')
-- ON CONFLICT (email) DO NOTHING;