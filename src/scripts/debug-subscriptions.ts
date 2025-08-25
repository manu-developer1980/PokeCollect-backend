import { stripeService } from '../lib/stripe-service';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Script de diagnóstico para verificar y corregir suscripciones duplicadas
 */
async function debugSubscriptions() {
  try {
    console.log('🔍 Iniciando diagnóstico de suscripciones...');
    
    // Email del usuario que reportó el problema
    const userEmail = 'manu.developer1980@gmail.com';
    
    console.log(`📧 Buscando cliente con email: ${userEmail}`);
    
    // Buscar el cliente en Stripe por email
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });
    
    if (customers.data.length === 0) {
      console.log('❌ No se encontró cliente con ese email');
      return;
    }
    
    const customer = customers.data[0];
    console.log(`✅ Cliente encontrado: ${customer.id}`);
    
    // Obtener todas las suscripciones activas
    console.log('🔍 Obteniendo suscripciones activas...');
    const activeSubscriptions = await stripeService.getCustomerActiveSubscriptions(customer.id);
    
    console.log(`📊 Suscripciones activas encontradas: ${activeSubscriptions.length}`);
    
    activeSubscriptions.forEach((sub, index) => {
      console.log(`\n📋 Suscripción ${index + 1}:`);
      console.log(`   ID: ${sub.id}`);
      console.log(`   Estado: ${sub.status}`);
      console.log(`   Producto: ${sub.items.data[0]?.price?.nickname || 'N/A'}`);
      console.log(`   Precio: ${sub.items.data[0]?.price?.unit_amount ? (sub.items.data[0].price.unit_amount / 100) : 'N/A'}€`);
      console.log(`   Creada: ${new Date((sub as any).created * 1000).toLocaleString()}`);
      console.log(`   Período actual: ${new Date((sub as any).current_period_start * 1000).toLocaleDateString()} - ${new Date((sub as any).current_period_end * 1000).toLocaleDateString()}`);
    });
    
    // Si hay más de una suscripción activa, ofrecer cancelar las anteriores
    if (activeSubscriptions.length > 1) {
      console.log('\n⚠️  PROBLEMA DETECTADO: Múltiples suscripciones activas');
      console.log('🔧 Procediendo a cancelar suscripciones anteriores...');
      
      // Ordenar por fecha de creación (más reciente primero)
      const sortedSubscriptions = activeSubscriptions.sort((a, b) => (b as any).created - (a as any).created);
      const newestSubscription = sortedSubscriptions[0];
      
      console.log(`\n✅ Manteniendo la suscripción más reciente: ${newestSubscription.id}`);
      
      // Cancelar las demás
      await stripeService.cancelOtherActiveSubscriptions(customer.id, newestSubscription.id);
      
      console.log('\n🎉 Proceso de limpieza completado');
    } else if (activeSubscriptions.length === 1) {
      console.log('\n✅ Solo hay una suscripción activa. Todo está correcto.');
    } else {
      console.log('\n❌ No se encontraron suscripciones activas');
    }
    
  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error);
  }
}

/**
 * Función para probar el webhook manualmente
 */
async function testWebhookLogic() {
  try {
    console.log('\n🧪 Probando lógica del webhook...');
    
    const userEmail = 'manu.developer1980@gmail.com';
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Buscar cliente
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });
    
    if (customers.data.length === 0) {
      console.log('❌ No se encontró cliente');
      return;
    }
    
    const customer = customers.data[0];
    
    // Obtener la suscripción más reciente
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });
    
    if (subscriptions.data.length === 0) {
      console.log('❌ No se encontraron suscripciones activas');
      return;
    }
    
    const latestSubscription = subscriptions.data[0];
    console.log(`🔄 Simulando webhook para suscripción: ${latestSubscription.id}`);
    
    // Simular el webhook handleSubscriptionCreated
    const customerId = typeof latestSubscription.customer === 'string' 
      ? latestSubscription.customer 
      : latestSubscription.customer?.id;
    
    if (customerId) {
      console.log(`🔄 Verificando suscripciones anteriores para el cliente ${customerId}`);
      await stripeService.cancelOtherActiveSubscriptions(customerId, latestSubscription.id);
      console.log(`✅ Procesamiento completo de suscripción ${latestSubscription.id}`);
    }
    
  } catch (error) {
    console.error('❌ Error probando webhook:', error);
  }
}

// Ejecutar el diagnóstico
if (require.main === module) {
  (async () => {
    await debugSubscriptions();
    await testWebhookLogic();
    process.exit(0);
  })();
}

export { debugSubscriptions, testWebhookLogic };