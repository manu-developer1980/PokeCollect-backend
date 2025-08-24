// Cargar variables de entorno
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addPlanTypeColumn() {
  try {
    console.log('🔧 Agregando columnas faltantes a la tabla users...');
    
    // Verificar estructura actual de la tabla
    console.log('🔍 Verificando estructura actual de la tabla users...');
    
    const { data: users, error: selectError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Error verificando tabla:', selectError);
      return;
    }
    
    if (users && users.length > 0) {
      console.log('📊 Columnas actuales en la tabla users:');
      console.log(Object.keys(users[0]).join(', '));
    }
    
    console.log('\n📋 SQL para ejecutar manualmente en Supabase:');
    console.log('=' .repeat(80));
    
    const alterTableSQL = `
-- Paso 1: Agregar columnas faltantes a la tabla users
DO $$
BEGIN
    -- Agregar plan_type si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'plan_type') THEN
        ALTER TABLE users ADD COLUMN plan_type VARCHAR(50) NOT NULL DEFAULT 'aprendiz';
    END IF;
    
    -- Agregar stripe_customer_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
    END IF;
    
    -- Agregar stripe_subscription_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_subscription_id') THEN
        ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255);
    END IF;
    
    -- Agregar updated_at si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Paso 2: Crear índices
CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);

-- Paso 3: Agregar restricciones únicas (solo si no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_stripe_customer_id_unique') THEN
        ALTER TABLE users ADD CONSTRAINT users_stripe_customer_id_unique UNIQUE (stripe_customer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_stripe_subscription_id_unique') THEN
        ALTER TABLE users ADD CONSTRAINT users_stripe_subscription_id_unique UNIQUE (stripe_subscription_id);
    END IF;
END $$;

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

-- Actualizar usuarios existentes para que tengan plan_type 'aprendiz'
UPDATE users SET plan_type = 'aprendiz' WHERE plan_type IS NULL OR plan_type = '';
`;
    
    console.log(alterTableSQL);
    console.log('=' .repeat(80));
    
    console.log('\n📝 Instrucciones:');
    console.log('1. Ve a tu dashboard de Supabase');
    console.log('2. Navega a SQL Editor');
    console.log('3. Copia y pega el SQL de arriba');
    console.log('4. Ejecuta el SQL');
    console.log('5. Ejecuta nuevamente este script para verificar');
    
    // Intentar verificar si ya se ejecutó
    console.log('\n🔍 Intentando verificar si las columnas ya existen...');
    
    const { data: testUsers, error: testError } = await supabase
      .from('users')
      .select('id, email, plan_type, stripe_customer_id, stripe_subscription_id')
      .limit(1);
    
    if (!testError) {
      console.log('✅ ¡Las columnas ya existen! La tabla está correctamente configurada.');
      
      // Mostrar usuarios actuales
      const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!allError && allUsers) {
        console.log('\n📊 Usuarios actuales:');
        allUsers.forEach(user => {
          console.log(`  - ${user.email}: ${user.plan_type || 'undefined'} (ID: ${user.id})`);
        });
      }
    } else {
      console.log('⚠️ Las columnas aún no existen. Por favor ejecuta el SQL manualmente.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
addPlanTypeColumn();