import dotenv from 'dotenv';

// Cargar variables de entorno ANTES de importar otros módulos
dotenv.config();

import { stripeService } from '../lib/stripe-service';

/**
 * Script para probar que no se crean clientes duplicados
 * al crear múltiples checkout sessions para el mismo usuario
 */
async function testCustomerCreation() {
  try {
    console.log('🧪 PRUEBA DE CREACIÓN DE CLIENTES');
    console.log('==================================\n');
    
    // Datos de prueba
    const testUserId = 'test-user-123';
    const testUserEmail = 'test.user@example.com';
    const testPriceId = process.env.STRIPE_ENTRENADOR_PRICE_ID || '';
    
    if (!testPriceId) {
      console.log('❌ ERROR: STRIPE_ENTRENADOR_PRICE_ID no configurado');
      return;
    }
    
    console.log(`👤 Usuario de prueba: ${testUserId}`);
    console.log(`📧 Email de prueba: ${testUserEmail}`);
    console.log(`💰 Price ID: ${testPriceId}\n`);
    
    // Limpiar clientes de prueba existentes
    await cleanupTestCustomers(testUserEmail, testUserId);
    
    console.log('🔄 Creando múltiples checkout sessions para el mismo usuario...');
    
    const sessions = [];
    
    // Crear 3 checkout sessions para el mismo usuario
    for (let i = 1; i <= 3; i++) {
      console.log(`\n📝 Creando checkout session ${i}/3...`);
      
      try {
        const session = await stripeService.createCheckoutSession({
          priceId: testPriceId,
          userId: testUserId,
          userEmail: testUserEmail,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });
        
        sessions.push(session);
        console.log(`✅ Session ${i} creada: ${session.id}`);
        
        // Pequeña pausa entre creaciones
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error creando session ${i}:`, error);
      }
    }
    
    console.log(`\n📊 Total de sessions creadas: ${sessions.length}`);
    
    // Verificar cuántos clientes se crearon
    await verifyCustomerCount(testUserEmail, testUserId);
    
    // Limpiar después de la prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    await cleanupTestCustomers(testUserEmail, testUserId);
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

/**
 * Verifica cuántos clientes existen para el usuario de prueba
 */
async function verifyCustomerCount(email: string, userId: string) {
  try {
    console.log('\n🔍 Verificando clientes creados...');
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Buscar por email
    const customersByEmail = await stripe.customers.list({
      email: email,
      limit: 10
    });
    
    console.log(`📧 Clientes encontrados por email: ${customersByEmail.data.length}`);
    
    // Buscar por userId en metadata
    const allCustomers = await stripe.customers.list({
      limit: 100
    });
    
    const customersByUserId = allCustomers.data.filter(
      (customer: any) => customer.metadata?.userId === userId
    );
    
    console.log(`👤 Clientes encontrados por userId: ${customersByUserId.length}`);
    
    // Mostrar detalles de los clientes encontrados
    if (customersByEmail.data.length > 0) {
      console.log('\n📋 Detalles de clientes:');
      customersByEmail.data.forEach((customer: any, index: number) => {
        console.log(`   Cliente ${index + 1}:`);
        console.log(`     ID: ${customer.id}`);
        console.log(`     Email: ${customer.email}`);
        console.log(`     UserId en metadata: ${customer.metadata?.userId || 'N/A'}`);
        console.log(`     Creado: ${new Date(customer.created * 1000).toLocaleString()}`);
      });
    }
    
    // Verificar resultado
    if (customersByEmail.data.length === 1 && customersByUserId.length === 1) {
      console.log('\n✅ ÉXITO: Solo se creó un cliente para el usuario');
      return true;
    } else {
      console.log('\n❌ PROBLEMA: Se crearon múltiples clientes para el mismo usuario');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verificando clientes:', error);
    return false;
  }
}

/**
 * Limpia los clientes de prueba
 */
async function cleanupTestCustomers(email: string, userId: string) {
  try {
    console.log('🧹 Limpiando clientes de prueba...');
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Buscar clientes por email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10
    });
    
    for (const customer of customers.data) {
      try {
        // Cancelar suscripciones activas primero
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active'
        });
        
        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id);
          console.log(`   ✅ Suscripción cancelada: ${subscription.id}`);
        }
        
        // Eliminar cliente
        await stripe.customers.del(customer.id);
        console.log(`   ✅ Cliente eliminado: ${customer.id}`);
        
      } catch (error) {
        console.log(`   ⚠️ Error eliminando cliente ${customer.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
}

/**
 * Función para probar con el usuario real que reportó el problema
 */
async function testWithRealUser() {
  try {
    console.log('\n🔍 VERIFICANDO USUARIO REAL');
    console.log('=============================\n');
    
    const realEmail = 'manu.developer1980@gmail.com';
    
    console.log(`📧 Verificando clientes para: ${realEmail}`);
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Buscar todos los clientes con ese email
    const customers = await stripe.customers.list({
      email: realEmail,
      limit: 20
    });
    
    console.log(`📊 Total de clientes encontrados: ${customers.data.length}`);
    
    if (customers.data.length > 1) {
      console.log('\n🚨 PROBLEMA CONFIRMADO: Múltiples clientes para el mismo email');
      
      customers.data.forEach((customer: any, index: number) => {
        console.log(`\n📋 Cliente ${index + 1}:`);
        console.log(`   ID: ${customer.id}`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   UserId: ${customer.metadata?.userId || 'N/A'}`);
        console.log(`   Creado: ${new Date(customer.created * 1000).toLocaleString()}`);
      });
      
      console.log('\n💡 Recomendación: Consolidar clientes duplicados manualmente en Stripe Dashboard');
    } else if (customers.data.length === 1) {
      console.log('\n✅ Solo hay un cliente para este email');
      const customer = customers.data[0];
      console.log(`   ID: ${customer.id}`);
      console.log(`   UserId: ${customer.metadata?.userId || 'N/A'}`);
    } else {
      console.log('\n❌ No se encontraron clientes con ese email');
    }
    
  } catch (error) {
    console.error('❌ Error verificando usuario real:', error);
  }
}

// Ejecutar las pruebas
if (require.main === module) {
  (async () => {
    await testCustomerCreation();
    await testWithRealUser();
    process.exit(0);
  })();
}

export { testCustomerCreation, verifyCustomerCount, testWithRealUser };