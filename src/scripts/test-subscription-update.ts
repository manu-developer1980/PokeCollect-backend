import dotenv from 'dotenv';

// Cargar variables de entorno ANTES de importar otros módulos
dotenv.config();

import { stripeService } from '../lib/stripe-service';

/**
 * Script para probar la funcionalidad de actualización de suscripciones
 * Simula el evento customer.subscription.updated que se envía cuando se cambia de plan
 */
async function testSubscriptionUpdate() {
  try {
    console.log('🧪 PRUEBA DE ACTUALIZACIÓN DE SUSCRIPCIÓN');
    console.log('==========================================\n');
    
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
    
    // Obtener suscripciones activas
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    });
    
    console.log(`📊 Suscripciones activas encontradas: ${subscriptions.data.length}\n`);
    
    if (subscriptions.data.length === 0) {
      console.log('❌ No hay suscripciones activas para probar');
      return;
    }
    
    // Tomar la primera suscripción para simular la actualización
    const subscription = subscriptions.data[0];
    
    console.log(`🎯 Simulando actualización de suscripción: ${subscription.id}`);
    console.log(`   Estado actual: ${subscription.status}`);
    console.log(`   Cliente: ${subscription.customer}`);
    
    // Simular el evento de webhook customer.subscription.updated
    const webhookEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: subscription
      }
    };
    
    console.log('\n🔄 Procesando evento de webhook simulado...');
    
    // Simular el procesamiento del webhook directamente
    // En lugar de usar processWebhook que requiere payload y signature,
    // llamamos directamente al método handleSubscriptionUpdated
    console.log('🔄 Simulando procesamiento de actualización de suscripción...');
    
    // Acceder al método privado a través de reflexión para pruebas
    const result = await (stripeService as any).handleSubscriptionUpdated(subscription);
    
    console.log('✅ Simulación de actualización procesada exitosamente');
    
    // Verificar el estado después del procesamiento
    console.log('\n🔍 Verificando estado después del procesamiento...');
    
    const updatedSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    });
    
    console.log(`📊 Suscripciones activas después del procesamiento: ${updatedSubscriptions.data.length}`);
    
    updatedSubscriptions.data.forEach((sub: any, index: number) => {
      console.log(`\n📋 Suscripción ${index + 1}:`);
      console.log(`   ID: ${sub.id}`);
      console.log(`   Estado: ${sub.status}`);
      console.log(`   Creada: ${new Date(sub.created * 1000).toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

/**
 * Función para crear una suscripción de prueba (opcional)
 */
async function createTestSubscription() {
  try {
    console.log('🧪 CREANDO SUSCRIPCIÓN DE PRUEBA');
    console.log('=================================\n');
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Buscar o crear un cliente de prueba
    const testEmail = 'test@example.com';
    let customer;
    
    const existingCustomers = await stripe.customers.list({
      email: testEmail,
      limit: 1
    });
    
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log(`✅ Cliente existente encontrado: ${customer.id}`);
    } else {
      customer = await stripe.customers.create({
        email: testEmail,
        name: 'Usuario de Prueba'
      });
      console.log(`✅ Nuevo cliente creado: ${customer.id}`);
    }
    
    // Crear una suscripción de prueba
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: process.env.STRIPE_ENTRENADOR_PRICE_ID // Plan básico
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });
    
    console.log(`✅ Suscripción de prueba creada: ${subscription.id}`);
    console.log(`   Estado: ${subscription.status}`);
    
    return { customer, subscription };
    
  } catch (error) {
    console.error('❌ Error creando suscripción de prueba:', error);
    return null;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testSubscriptionUpdate()
    .then(() => {
      console.log('\n🏁 PRUEBA COMPLETADA');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en la prueba:', error);
      process.exit(1);
    });
}

export { testSubscriptionUpdate, createTestSubscription };