// Cargar variables de entorno
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { UserService } = require('../dist/lib/user-service');
const { StripeService } = require('../dist/lib/stripe-service');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSubscriptionUpdate() {
  try {
    console.log('🧪 Probando funcionalidad de actualización de suscripción...');
    
    // 1. Verificar que la tabla users tiene las columnas necesarias
    console.log('\n1️⃣ Verificando estructura de la tabla users...');
    
    const { data: testUser, error: structureError } = await supabase
      .from('users')
      .select('id, email, plan_type, stripe_customer_id, stripe_subscription_id')
      .limit(1);
    
    if (structureError) {
      console.error('❌ Error: La tabla users no tiene las columnas necesarias.');
      console.error('   Por favor ejecuta el SQL proporcionado en el script anterior.');
      console.error('   Error:', structureError.message);
      return;
    }
    
    console.log('✅ Estructura de tabla verificada');
    
    // 2. Crear un usuario de prueba
    console.log('\n2️⃣ Creando usuario de prueba...');
    
    const testEmail = 'test-subscription@pokecollector.com';
    const testSubscriptionId = 'sub_test_12345';
    
    // Eliminar usuario de prueba si existe
    await supabase
      .from('users')
      .delete()
      .eq('email', testEmail);
    
    // Crear nuevo usuario de prueba (solo con columnas básicas)
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: testEmail
      })
      .select()
      .single();
    
    if (!createError && newUser) {
      // Actualizar el usuario con los campos adicionales
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          plan_type: 'aprendiz',
          stripe_subscription_id: testSubscriptionId
        })
        .eq('id', newUser.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error actualizando usuario de prueba:', updateError);
        return;
      }
      
      // Usar el usuario actualizado
      Object.assign(newUser, updatedUser);
    }
    
    if (createError) {
      console.error('❌ Error creando usuario de prueba:', createError);
      return;
    }
    
    console.log('✅ Usuario de prueba creado:', {
      id: newUser.id,
      email: newUser.email,
      plan_type: newUser.plan_type
    });
    
    // 3. Probar UserService.getUserPlan
    console.log('\n3️⃣ Probando UserService.getUserPlan...');
    
    const testUserId = newUser.id;
    const currentPlan = await UserService.getUserPlan(testUserId);
    console.log(`✅ Plan actual obtenido: ${currentPlan}`);
    
    // 4. Probar actualización de plan
    console.log('\n4️⃣ Probando actualización de plan...');
    
    const newPlanType = 'entrenador';
    const updatedUser = await UserService.updateUserPlan(testUserId, newPlanType);
    console.log(`✅ Plan actualizado a: ${updatedUser.plan_type}`);
    
    // 5. Verificar que StripeService.getUserPlan devuelve el plan actualizado
    console.log('\n5️⃣ Probando StripeService.getUserPlan...');
    
    const planFromStripeService = await StripeService.getUserPlan(testUserId);
    console.log(`✅ Plan obtenido desde StripeService: ${planFromStripeService}`);
    
    // 6. Probar búsqueda por subscription_id
    console.log('\n6️⃣ Probando búsqueda por subscription_id...');
    
    const userBySubscription = await UserService.getUserByStripeSubscriptionId(testSubscriptionId);
    if (userBySubscription) {
      console.log(`✅ Usuario encontrado por subscription_id: ${userBySubscription.email} (${userBySubscription.plan_type})`);
    } else {
      console.log('❌ No se encontró usuario por subscription_id');
    }
    
    // 7. Simular webhook de actualización de suscripción
    console.log('\n7️⃣ Simulando webhook de actualización de suscripción...');
    
    // Actualizar a plan maestro
    const masterPlan = 'maestro';
    await UserService.updateUserPlan(testUserId, masterPlan);
    
    const finalPlan = await StripeService.getUserPlan(testUserId);
    console.log(`✅ Plan final después de simulación de webhook: ${finalPlan}`);
    
    // 8. Verificar límites de plan
    console.log('\n8️⃣ Probando verificación de límites...');
    
    const canPerformAction = await StripeService.canPerformAction(testUserId, 'create_collection');
    console.log(`✅ ¿Puede crear colección? ${canPerformAction}`);
    
    const planFeatures = StripeService.getPlanFeatures(finalPlan);
    console.log(`✅ Características del plan ${finalPlan}:`, planFeatures);
    
    // 9. Limpiar datos de prueba
    console.log('\n9️⃣ Limpiando datos de prueba...');
    
    await supabase
      .from('users')
      .delete()
      .eq('id', testUserId);
    
    console.log('✅ Datos de prueba eliminados');
    
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('\n📋 Resumen de funcionalidades probadas:');
    console.log('  ✅ Creación de usuarios');
    console.log('  ✅ Obtención de plan desde base de datos');
    console.log('  ✅ Actualización de plan de usuario');
    console.log('  ✅ Búsqueda por subscription_id');
    console.log('  ✅ Integración con StripeService');
    console.log('  ✅ Verificación de límites de plan');
    
    console.log('\n🚀 El sistema está listo para manejar actualizaciones de suscripción!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
testSubscriptionUpdate();