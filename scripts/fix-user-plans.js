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

async function fixUserPlans() {
  try {
    console.log('🔧 Arreglando planes de usuarios...');
    
    // Obtener todos los usuarios con plan_type null o undefined
    const { data: usersToFix, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .or('plan_type.is.null,plan_type.eq.');
    
    if (fetchError) {
      console.error('❌ Error obteniendo usuarios:', fetchError);
      return;
    }
    
    if (!usersToFix || usersToFix.length === 0) {
      console.log('✅ Todos los usuarios ya tienen plan_type definido');
      return;
    }
    
    console.log(`📊 Encontrados ${usersToFix.length} usuarios sin plan_type:`);
    usersToFix.forEach(user => {
      console.log(`  - ${user.email}: ${user.plan_type || 'undefined'} (ID: ${user.id})`);
    });
    
    // Actualizar todos los usuarios sin plan_type a 'aprendiz'
    const { data: updatedUsers, error: updateError } = await supabase
      .from('users')
      .update({ 
        plan_type: 'aprendiz',
        updated_at: new Date().toISOString()
      })
      .or('plan_type.is.null,plan_type.eq.')
      .select();
    
    if (updateError) {
      console.error('❌ Error actualizando usuarios:', updateError);
      return;
    }
    
    console.log(`✅ Actualizados ${updatedUsers?.length || 0} usuarios a plan 'aprendiz'`);
    
    // Mostrar el estado final
    const { data: allUsers, error: finalError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!finalError && allUsers) {
      console.log('\n📊 Estado final de todos los usuarios:');
      allUsers.forEach(user => {
        console.log(`  - ${user.email}: ${user.plan_type} (ID: ${user.id})`);
      });
    }
    
    console.log('\n🎉 Planes de usuarios arreglados exitosamente');
    
  } catch (error) {
    console.error('❌ Error arreglando planes:', error);
    process.exit(1);
  }
}

// Ejecutar fix
fixUserPlans();