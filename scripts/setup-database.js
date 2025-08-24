// Cargar variables de entorno
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos');
  console.error('Variables disponibles:', {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('🚀 Configurando base de datos...');
    
    // Verificar si la tabla ya existe
    console.log('🔍 Verificando si la tabla "users" existe...');
    
    const { data: existingTable, error: checkError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ La tabla "users" ya existe');
      
      // Mostrar algunos registros de ejemplo
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(5);
      
      if (!usersError && users) {
        console.log(`📊 Registros en la tabla (${users.length} de máximo 5):`);
        users.forEach(user => {
          console.log(`  - ${user.email}: ${user.plan_type} (ID: ${user.id})`);
        });
      }
      
      return;
    }
    
    console.log('📝 La tabla "users" no existe, creándola...');
    
    // Crear la tabla usando SQL raw
    const createTableSQL = `
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        plan_type VARCHAR(50) NOT NULL DEFAULT 'aprendiz',
        stripe_customer_id VARCHAR(255) UNIQUE,
        stripe_subscription_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Intentar crear la tabla usando una función SQL personalizada
    const { data, error } = await supabase.rpc('exec_sql', {
      query: createTableSQL
    });
    
    if (error) {
      console.log('⚠️ No se pudo crear la tabla automáticamente.');
      console.log('📋 Por favor, ejecuta manualmente este SQL en tu dashboard de Supabase:');
      console.log('\n' + '='.repeat(60));
      console.log(createTableSQL);
      console.log('\n-- Crear índices');
      console.log('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
      console.log('CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);');
      console.log('\n-- Crear función para actualizar updated_at');
      console.log(`CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';`);
      console.log('\n-- Crear trigger');
      console.log(`CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();`);
      console.log('='.repeat(60));
      
      // Crear un usuario de prueba para verificar que el sistema funciona
      console.log('\n🧪 Creando usuario de prueba...');
      const testUser = {
        id: '550e8400-e29b-41d4-a716-446655440000', // UUID fijo para pruebas
        email: 'test@pokecollector.com',
        plan_type: 'aprendiz'
      };
      
      // Intentar insertar directamente (esto fallará si la tabla no existe)
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert(testUser)
        .select();
      
      if (insertError) {
        console.log('❌ No se pudo crear el usuario de prueba. La tabla probablemente no existe.');
        console.log('   Por favor, crea la tabla manualmente usando el SQL de arriba.');
      } else {
        console.log('✅ Usuario de prueba creado:', insertData[0]);
      }
    } else {
      console.log('✅ Tabla "users" creada exitosamente');
    }
    
    console.log('\n🎉 Configuración completada');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Verifica que la tabla "users" existe en tu dashboard de Supabase');
    console.log('2. Configura las políticas RLS (Row Level Security) si es necesario');
    console.log('3. Prueba la funcionalidad de actualización de suscripciones');
    
  } catch (error) {
    console.error('❌ Error configurando base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar setup
setupDatabase();