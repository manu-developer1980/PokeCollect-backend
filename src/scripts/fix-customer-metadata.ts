import dotenv from 'dotenv';

// Cargar variables de entorno ANTES de importar otros módulos
dotenv.config();

/**
 * Script para actualizar los clientes existentes en Stripe
 * agregando el userId en metadata basado en las suscripciones
 */
async function fixCustomerMetadata() {
  try {
    console.log('🔧 REPARANDO METADATA DE CLIENTES');
    console.log('==================================\n');
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    if (!stripe) {
      console.log('❌ ERROR: STRIPE_SECRET_KEY no configurado');
      return;
    }
    
    // Obtener todos los clientes
    console.log('📋 Obteniendo todos los clientes...');
    const allCustomers = await stripe.customers.list({
      limit: 100
    });
    
    console.log(`📊 Total de clientes encontrados: ${allCustomers.data.length}\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const customer of allCustomers.data) {
      console.log(`\n🔍 Procesando cliente: ${customer.id} (${customer.email})`);
      
      // Si ya tiene userId en metadata, saltar
      if (customer.metadata?.userId) {
        console.log(`   ✅ Ya tiene userId: ${customer.metadata.userId}`);
        skippedCount++;
        continue;
      }
      
      // Buscar suscripciones activas para este cliente
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 10
      });
      
      if (subscriptions.data.length === 0) {
        console.log('   ⚠️ No tiene suscripciones activas');
        skippedCount++;
        continue;
      }
      
      // Buscar userId en metadata de suscripciones
      let userId = null;
      for (const subscription of subscriptions.data) {
        if (subscription.metadata?.userId) {
          userId = subscription.metadata.userId;
          break;
        }
      }
      
      if (!userId) {
        console.log('   ⚠️ No se encontró userId en las suscripciones');
        skippedCount++;
        continue;
      }
      
      // Actualizar cliente con userId
      try {
        await stripe.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            userId: userId
          }
        });
        
        console.log(`   ✅ Actualizado con userId: ${userId}`);
        updatedCount++;
        
      } catch (error) {
        console.log(`   ❌ Error actualizando cliente: ${error}`);
      }
    }
    
    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Clientes actualizados: ${updatedCount}`);
    console.log(`   ⚠️ Clientes omitidos: ${skippedCount}`);
    console.log(`   📋 Total procesados: ${allCustomers.data.length}`);
    
  } catch (error) {
    console.error('❌ Error en el script:', error);
  }
}

/**
 * Función para consolidar clientes duplicados
 * (mantiene el más reciente y transfiere suscripciones)
 */
async function consolidateDuplicateCustomers() {
  try {
    console.log('\n🔄 CONSOLIDANDO CLIENTES DUPLICADOS');
    console.log('====================================\n');
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Agrupar clientes por email
    const allCustomers = await stripe.customers.list({
      limit: 100
    });
    
    const customersByEmail = new Map<string, any[]>();
    
    for (const customer of allCustomers.data) {
      if (customer.email) {
        if (!customersByEmail.has(customer.email)) {
          customersByEmail.set(customer.email, []);
        }
        customersByEmail.get(customer.email)!.push(customer);
      }
    }
    
    // Procesar emails con múltiples clientes
    for (const [email, customers] of customersByEmail.entries()) {
      if (customers.length > 1) {
        console.log(`\n📧 Email con duplicados: ${email} (${customers.length} clientes)`);
        
        // Ordenar por fecha de creación (más reciente primero)
        customers.sort((a, b) => b.created - a.created);
        
        const keepCustomer = customers[0]; // El más reciente
        const duplicateCustomers = customers.slice(1);
        
        console.log(`   ✅ Mantener: ${keepCustomer.id} (creado: ${new Date(keepCustomer.created * 1000).toLocaleString()})`);
        
        for (const duplicate of duplicateCustomers) {
          console.log(`   🗑️ Eliminar: ${duplicate.id} (creado: ${new Date(duplicate.created * 1000).toLocaleString()})`);
          
          try {
            // Cancelar suscripciones del cliente duplicado
            const subscriptions = await stripe.subscriptions.list({
              customer: duplicate.id,
              status: 'active'
            });
            
            for (const subscription of subscriptions.data) {
              await stripe.subscriptions.cancel(subscription.id);
              console.log(`     ❌ Suscripción cancelada: ${subscription.id}`);
            }
            
            // Eliminar cliente duplicado
            await stripe.customers.del(duplicate.id);
            console.log(`     ✅ Cliente eliminado: ${duplicate.id}`);
            
          } catch (error) {
            console.log(`     ❌ Error eliminando cliente ${duplicate.id}: ${error}`);
          }
        }
      }
    }
    
    console.log('\n✅ Consolidación completada');
    
  } catch (error) {
    console.error('❌ Error consolidando clientes:', error);
  }
}

/**
 * Función para mostrar estadísticas de clientes
 */
async function showCustomerStats() {
  try {
    console.log('\n📊 ESTADÍSTICAS DE CLIENTES');
    console.log('============================\n');
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const allCustomers = await stripe.customers.list({
      limit: 100
    });
    
    const stats = {
      total: allCustomers.data.length,
      withUserId: 0,
      withoutUserId: 0,
      withActiveSubscriptions: 0,
      duplicateEmails: 0
    };
    
    const emailCounts = new Map<string, number>();
    
    for (const customer of allCustomers.data) {
      // Contar userId
      if (customer.metadata?.userId) {
        stats.withUserId++;
      } else {
        stats.withoutUserId++;
      }
      
      // Contar emails duplicados
      if (customer.email) {
        const count = emailCounts.get(customer.email) || 0;
        emailCounts.set(customer.email, count + 1);
      }
      
      // Verificar suscripciones activas
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1
      });
      
      if (subscriptions.data.length > 0) {
        stats.withActiveSubscriptions++;
      }
    }
    
    // Contar emails duplicados
    for (const count of emailCounts.values()) {
      if (count > 1) {
        stats.duplicateEmails += count;
      }
    }
    
    console.log(`📋 Total de clientes: ${stats.total}`);
    console.log(`✅ Con userId en metadata: ${stats.withUserId}`);
    console.log(`❌ Sin userId en metadata: ${stats.withoutUserId}`);
    console.log(`🔄 Con suscripciones activas: ${stats.withActiveSubscriptions}`);
    console.log(`📧 Clientes con emails duplicados: ${stats.duplicateEmails}`);
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
  }
}

// Ejecutar el script
if (require.main === module) {
  (async () => {
    await showCustomerStats();
    await fixCustomerMetadata();
    await showCustomerStats();
    
    console.log('\n❓ ¿Deseas consolidar clientes duplicados?');
    console.log('   (Esto eliminará clientes duplicados manteniendo el más reciente)');
    console.log('   Ejecuta: npm run consolidate-customers');
    
    process.exit(0);
  })();
}

export { fixCustomerMetadata, consolidateDuplicateCustomers, showCustomerStats };