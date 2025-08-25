import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Script para probar la Edge Function de Supabase para webhooks de Stripe
 */
async function testSupabaseWebhook() {
  try {
    console.log('🧪 PRUEBA DE EDGE FUNCTION DE SUPABASE');
    console.log('=====================================\n');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const webhookUrl = `${supabaseUrl}/functions/v1/stripe-webhook`;
    
    console.log(`🌐 URL de la función: ${webhookUrl}\n`);
    
    // Probar que la función responda
    console.log('🔍 Probando conectividad de la función...');
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'GET', // Debería devolver 405 Method Not Allowed
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Status Text: ${response.statusText}`);
      
      if (response.status === 405) {
        console.log('✅ PERFECTO: La función está desplegada y responde correctamente');
        console.log('   (405 Method Not Allowed es esperado para GET requests)\n');
      } else {
        console.log('⚠️  Respuesta inesperada, pero la función está accesible\n');
      }
      
      const responseText = await response.text();
      if (responseText) {
        console.log('📄 Respuesta:', responseText);
      }
      
    } catch (fetchError: any) {
      console.error('❌ Error conectando con la función:', fetchError.message);
      console.log('\n💡 POSIBLES CAUSAS:');
      console.log('1. La función no está desplegada');
      console.log('2. Error en la URL de Supabase');
      console.log('3. Problema de conectividad\n');
      
      console.log('🔧 SOLUCIONES:');
      console.log('1. Desplegar la función: supabase functions deploy stripe-webhook');
      console.log('2. Verificar funciones: supabase functions list');
      console.log('3. Ver logs: supabase functions logs stripe-webhook\n');
      return;
    }
    
    // Verificar configuración de variables de entorno
    console.log('🔐 VERIFICACIÓN DE CONFIGURACIÓN:');
    
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!stripeKey || stripeKey.includes('your_stripe_secret_key_here')) {
      console.log('⚠️  STRIPE_SECRET_KEY no configurada localmente');
      console.log('   Esto está bien si usas solo la Edge Function');
    } else {
      console.log('✅ STRIPE_SECRET_KEY configurada localmente');
    }
    
    if (!webhookSecret || webhookSecret.includes('your_webhook_secret_here')) {
      console.log('⚠️  STRIPE_WEBHOOK_SECRET no configurada localmente');
      console.log('   Esto está bien si usas solo la Edge Function');
    } else {
      console.log('✅ STRIPE_WEBHOOK_SECRET configurada localmente');
    }
    
    console.log('\n📋 CHECKLIST DE CONFIGURACIÓN:');
    console.log('\n🔧 EN SUPABASE (REQUERIDO):');
    console.log('□ supabase secrets set STRIPE_SECRET_KEY=sk_test_...');
    console.log('□ supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...');
    console.log('□ supabase functions deploy stripe-webhook');
    
    console.log('\n🌐 EN STRIPE DASHBOARD:');
    console.log('□ Webhook URL: https://kiphglgoanmibjztwhmj.supabase.co/functions/v1/stripe-webhook');
    console.log('□ Eventos: customer.subscription.created, customer.subscription.updated, etc.');
    console.log('□ Webhook activo y funcionando');
    
    console.log('\n🧪 COMANDOS PARA VERIFICAR:');
    console.log('```bash');
    console.log('# Ver funciones desplegadas');
    console.log('supabase functions list');
    console.log('');
    console.log('# Ver logs en tiempo real');
    console.log('supabase functions logs stripe-webhook --follow');
    console.log('');
    console.log('# Ver variables configuradas');
    console.log('supabase secrets list');
    console.log('```');
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Configura las variables de entorno en Supabase');
    console.log('2. Despliega la función si no lo has hecho');
    console.log('3. Configura el webhook en Stripe Dashboard');
    console.log('4. Prueba creando una nueva suscripción');
    console.log('5. Monitorea los logs: supabase functions logs stripe-webhook --follow');
    
    console.log('\n🏁 PRUEBA COMPLETADA');
    
  } catch (error: any) {
    console.error('\n❌ ERROR durante la prueba:', error);
  }
}

/**
 * Simula un webhook de Stripe para probar la función
 */
async function simulateStripeWebhook() {
  try {
    console.log('\n🎭 SIMULANDO WEBHOOK DE STRIPE');
    console.log('==============================\n');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const webhookUrl = `${supabaseUrl}/functions/v1/stripe-webhook`;
    
    // Payload de ejemplo (no será procesado sin firma válida)
    const mockPayload = {
      id: 'evt_test_webhook',
      object: 'event',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          status: 'active'
        }
      }
    };
    
    console.log('📤 Enviando webhook simulado...');
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test_signature' // Firma inválida a propósito
        },
        body: JSON.stringify(mockPayload)
      });
      
      console.log(`📊 Status: ${response.status}`);
      const responseText = await response.text();
      console.log(`📄 Respuesta: ${responseText}`);
      
      if (response.status === 400) {
        console.log('\n✅ ESPERADO: Error 400 por firma inválida');
        console.log('   Esto confirma que la función está funcionando correctamente');
      }
      
    } catch (error: any) {
      console.error('❌ Error enviando webhook simulado:', error.message);
    }
    
  } catch (error: any) {
    console.error('❌ Error en simulación:', error);
  }
}

// Ejecutar las pruebas
if (require.main === module) {
  (async () => {
    await testSupabaseWebhook();
    await simulateStripeWebhook();
    process.exit(0);
  })();
}

export { testSupabaseWebhook, simulateStripeWebhook };