import dotenv from 'dotenv';

// Cargar variables de entorno ANTES de importar otros módulos
dotenv.config();

import Stripe from 'stripe';

/**
 * Script para actualizar el metadata del cliente existente con el userId correcto
 */
async function updateCustomerMetadata() {
  try {
    console.log('🔧 ACTUALIZACIÓN DE METADATA DEL CLIENTE');
    console.log('========================================\n');
    
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey || stripeSecretKey.includes('your_stripe_secret_key_here')) {
      console.log('❌ ERROR: STRIPE_SECRET_KEY no configurada correctamente');
      return;
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-07-30.basil'
    });
    
    // Email del usuario que necesita actualización
    const userEmail = 'manu.developer1980@gmail.com';
    const correctUserId = 'user-manu-developer'; // ID correcto del usuario
    
    console.log(`🔍 Buscando cliente: ${userEmail}`);
    
    // Buscar el cliente por email
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
    console.log(`📧 Email: ${customer.email}`);
    console.log(`📝 Metadata actual:`, customer.metadata);
    
    // Verificar si ya tiene userId
    if (customer.metadata?.userId) {
      console.log(`✅ El cliente ya tiene userId en metadata: ${customer.metadata.userId}`);
      return;
    }
    
    // Actualizar metadata con userId
    console.log(`\n🔄 Actualizando metadata con userId: ${correctUserId}`);
    
    const updatedCustomer = await stripe.customers.update(customer.id, {
      metadata: {
        ...customer.metadata,
        userId: correctUserId
      }
    });
    
    console.log('✅ Cliente actualizado exitosamente');
    console.log(`📝 Nuevo metadata:`, updatedCustomer.metadata);
    
    // Verificar suscripciones activas
    console.log('\n📋 Verificando suscripciones activas...');
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    });
    
    console.log(`✅ Suscripciones activas: ${subscriptions.data.length}`);
    
    subscriptions.data.forEach((sub, index) => {
      const priceId = sub.items.data[0]?.price?.id;
      const amount = sub.items.data[0]?.price?.unit_amount;
      const currency = sub.items.data[0]?.price?.currency;
      const interval = sub.items.data[0]?.price?.recurring?.interval;
      
      console.log(`  ${index + 1}. ID: ${sub.id}`);
      console.log(`     Price ID: ${priceId}`);
      console.log(`     Precio: ${amount ? (amount / 100) : 'N/A'} ${currency}/${interval}`);
      console.log(`     Estado: ${sub.status}`);
      console.log(`     Metadata:`, sub.metadata);
      console.log('');
    });
    
    // Actualizar metadata de suscripciones si es necesario
    for (const subscription of subscriptions.data) {
      if (!subscription.metadata?.userId) {
        console.log(`🔄 Actualizando metadata de suscripción: ${subscription.id}`);
        await stripe.subscriptions.update(subscription.id, {
          metadata: {
            ...subscription.metadata,
            userId: correctUserId
          }
        });
        console.log('✅ Suscripción actualizada');
      }
    }
    
    console.log('\n🎉 Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar el script
if (require.main === module) {
  updateCustomerMetadata();
}

export { updateCustomerMetadata };