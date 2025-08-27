import { stripeService } from '../lib/stripe-service';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Script para limpiar suscripciones duplicadas una vez configuradas las claves de Stripe
 */
async function fixDuplicateSubscriptions() {
  try {
    console.log('🔧 LIMPIEZA DE SUSCRIPCIONES DUPLICADAS');
    console.log('=====================================\n');
    
    // Verificar configuración de Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!stripeKey || stripeKey.includes('your_stripe_secret_key_here')) {
      console.log('❌ ERROR: STRIPE_SECRET_KEY no configurada correctamente');
      console.log('📖 Lee el archivo STRIPE_SETUP.md para instrucciones detalladas\n');
      return;
    }
    
    if (!webhookSecret || webhookSecret.includes('your_webhook_secret_here')) {
      console.log('⚠️  ADVERTENCIA: STRIPE_WEBHOOK_SECRET no configurada');
      console.log('   Los webhooks automáticos no funcionarán hasta que la configures\n');
    }
    
    console.log('✅ Claves de Stripe configuradas correctamente\n');
    
    // Email del usuario que reportó el problema
    const userEmail = 'manu.developer1980@gmail.com';
    
    console.log(`🔍 Buscando cliente: ${userEmail}`);
    
    // Buscar el cliente en Stripe por email
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });
    
    if (customers.data.length === 0) {
      console.log('❌ No se encontró cliente con ese email');
      console.log('💡 Verifica que el email sea correcto en Stripe Dashboard\n');
      return;
    }
    
    const customer = customers.data[0];
    console.log(`✅ Cliente encontrado: ${customer.id}\n`);
    
    // Obtener todas las suscripciones activas
    console.log('📊 Analizando suscripciones...');
    const activeSubscriptions = await stripeService.getCustomerActiveSubscriptions(customer.id);
    
    console.log(`📈 Suscripciones activas: ${activeSubscriptions.length}\n`);
    
    if (activeSubscriptions.length === 0) {
      console.log('ℹ️  No se encontraron suscripciones activas');
      return;
    }
    
    // Mostrar detalles de cada suscripción
    activeSubscriptions.forEach((sub, index) => {
      const created = new Date((sub as any).created * 1000);
      const productName = sub.items.data[0]?.price?.nickname || 'N/A';
      const amount = sub.items.data[0]?.price?.unit_amount ? (sub.items.data[0].price.unit_amount / 100) : 0;
      
      console.log(`📋 Suscripción ${index + 1}:`);
      console.log(`   ID: ${sub.id}`);
      console.log(`   Producto: ${productName}`);
      console.log(`   Precio: €${amount}/año`);
      console.log(`   Estado: ${sub.status}`);
      console.log(`   Creada: ${created.toLocaleString('es-ES')}\n`);
    });
    
    // Si hay múltiples suscripciones, limpiar
    if (activeSubscriptions.length > 1) {
      console.log('🚨 PROBLEMA DETECTADO: Múltiples suscripciones activas\n');
      
      // Ordenar por fecha de creación (más reciente primero)
      const sortedSubscriptions = activeSubscriptions.sort((a, b) => (b as any).created - (a as any).created);
      const newestSubscription = sortedSubscriptions[0];
      const oldSubscriptions = sortedSubscriptions.slice(1);
      
      const newestProduct = newestSubscription.items.data[0]?.price?.nickname || 'N/A';
      console.log(`✅ Manteniendo la más reciente: ${newestProduct} (${newestSubscription.id})\n`);
      
      console.log('🔄 Cancelando suscripciones anteriores...');
      oldSubscriptions.forEach((sub, index) => {
        const productName = sub.items.data[0]?.price?.nickname || 'N/A';
        console.log(`   ${index + 1}. Cancelando: ${productName} (${sub.id})`);
      });
      
      // Ejecutar la cancelación
      await stripeService.cancelOtherActiveSubscriptions(customer.id, newestSubscription.id);
      
      console.log('\n🎉 LIMPIEZA COMPLETADA');
      console.log('✅ Solo queda una suscripción activa');
      console.log('✅ Las suscripciones duplicadas han sido canceladas\n');
      
    } else {
      console.log('✅ PERFECTO: Solo hay una suscripción activa');
      console.log('ℹ️  No se requiere limpieza\n');
    }
    
    // Verificar configuración del webhook
    console.log('🔍 VERIFICACIÓN DEL WEBHOOK:');
    if (webhookSecret && !webhookSecret.includes('your_webhook_secret_here')) {
      console.log('✅ Webhook configurado - Las futuras suscripciones se manejarán automáticamente');
    } else {
      console.log('⚠️  Webhook NO configurado - Configúralo para prevenir futuros duplicados');
      console.log('📖 Consulta STRIPE_SETUP.md para instrucciones del webhook');
    }
    
    console.log('\n🏁 PROCESO COMPLETADO');
    
  } catch (error) {
    console.error('\n❌ ERROR durante la limpieza:', error);
    
    if (error instanceof Error && error.message?.includes('Invalid API Key')) {
      console.log('\n💡 SOLUCIÓN: Verifica que STRIPE_SECRET_KEY sea correcta');
      console.log('📖 Consulta STRIPE_SETUP.md para instrucciones detalladas');
    }
  }
}

// Ejecutar el script
if (require.main === module) {
  (async () => {
    await fixDuplicateSubscriptions();
    process.exit(0);
  })();
}

export { fixDuplicateSubscriptions };