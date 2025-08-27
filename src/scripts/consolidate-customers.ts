import dotenv from 'dotenv';

// Cargar variables de entorno ANTES de importar otros módulos
dotenv.config();

/**
 * Script para consolidar clientes duplicados en Stripe
 * Mantiene el cliente con suscripción activa o el más reciente
 */
async function consolidateCustomers() {
  try {
    console.log('🔄 CONSOLIDANDO CLIENTES DUPLICADOS');
    console.log('====================================\n');
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    if (!stripe) {
      console.log('❌ ERROR: STRIPE_SECRET_KEY no configurado');
      return;
    }
    
    // Obtener todos los clientes
    const allCustomers = await stripe.customers.list({
      limit: 100
    });
    
    console.log(`📊 Total de clientes: ${allCustomers.data.length}\n`);
    
    // Agrupar por email
    const customersByEmail = new Map<string, any[]>();
    
    for (const customer of allCustomers.data) {
      if (customer.email) {
        if (!customersByEmail.has(customer.email)) {
          customersByEmail.set(customer.email, []);
        }
        customersByEmail.get(customer.email)!.push(customer);
      }
    }
    
    let totalProcessed = 0;
    let totalDeleted = 0;
    
    // Procesar cada grupo de email
    for (const [email, customers] of customersByEmail.entries()) {
      if (customers.length > 1) {
        console.log(`\n📧 Email: ${email} (${customers.length} clientes duplicados)`);
        
        // Verificar cuál cliente tiene suscripciones activas
        const customersWithSubscriptions = [];
        
        for (const customer of customers) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 10
          });
          
          if (subscriptions.data.length > 0) {
            customersWithSubscriptions.push({
              customer,
              subscriptions: subscriptions.data
            });
            console.log(`   ✅ ${customer.id} - Tiene ${subscriptions.data.length} suscripción(es) activa(s)`);
          } else {
            console.log(`   ❌ ${customer.id} - Sin suscripciones activas (creado: ${new Date(customer.created * 1000).toLocaleString()})`);
          }
        }
        
        let keepCustomer;
        
        if (customersWithSubscriptions.length > 0) {
          // Si hay clientes con suscripciones, mantener el primero
          keepCustomer = customersWithSubscriptions[0].customer;
          console.log(`   🎯 Manteniendo cliente con suscripciones: ${keepCustomer.id}`);
          
          // Si hay múltiples clientes con suscripciones, transferir todas al primero
          if (customersWithSubscriptions.length > 1) {
            console.log(`   ⚠️ Múltiples clientes con suscripciones, consolidando...`);
            
            for (let i = 1; i < customersWithSubscriptions.length; i++) {
              const sourceCustomer = customersWithSubscriptions[i].customer;
              const subscriptions = customersWithSubscriptions[i].subscriptions;
              
              console.log(`   🔄 Transfiriendo ${subscriptions.length} suscripción(es) de ${sourceCustomer.id} a ${keepCustomer.id}`);
              
              for (const subscription of subscriptions) {
                try {
                  await stripe.subscriptions.update(subscription.id, {
                    customer: keepCustomer.id
                  });
                  console.log(`     ✅ Suscripción transferida: ${subscription.id}`);
                } catch (error) {
                  console.log(`     ❌ Error transfiriendo suscripción ${subscription.id}: ${error}`);
                }
              }
            }
          }
        } else {
          // Si ninguno tiene suscripciones, mantener el más reciente
          customers.sort((a, b) => b.created - a.created);
          keepCustomer = customers[0];
          console.log(`   🎯 Manteniendo cliente más reciente: ${keepCustomer.id}`);
        }
        
        // Actualizar metadata del cliente que se mantiene
        if (!keepCustomer.metadata?.userId) {
          // Buscar userId en suscripciones
          const subscriptions = await stripe.subscriptions.list({
            customer: keepCustomer.id,
            limit: 10
          });
          
          let userId = null;
          for (const subscription of subscriptions.data) {
            if (subscription.metadata?.userId) {
              userId = subscription.metadata.userId;
              break;
            }
          }
          
          if (userId) {
            try {
              await stripe.customers.update(keepCustomer.id, {
                metadata: {
                  ...keepCustomer.metadata,
                  userId: userId
                }
              });
              console.log(`   ✅ Metadata actualizado con userId: ${userId}`);
            } catch (error) {
              console.log(`   ❌ Error actualizando metadata: ${error}`);
            }
          }
        }
        
        // Eliminar clientes duplicados
        const customersToDelete = customers.filter(c => c.id !== keepCustomer.id);
        
        for (const customer of customersToDelete) {
          try {
            // Cancelar suscripciones restantes
            const subscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              status: 'active'
            });
            
            for (const subscription of subscriptions.data) {
              await stripe.subscriptions.cancel(subscription.id);
              console.log(`     ❌ Suscripción cancelada: ${subscription.id}`);
            }
            
            // Eliminar cliente
            await stripe.customers.del(customer.id);
            console.log(`   🗑️ Cliente eliminado: ${customer.id}`);
            totalDeleted++;
            
          } catch (error) {
            console.log(`   ❌ Error eliminando cliente ${customer.id}: ${error}`);
          }
        }
        
        totalProcessed++;
      }
    }
    
    console.log('\n📊 RESUMEN DE CONSOLIDACIÓN:');
    console.log(`   📧 Emails procesados: ${totalProcessed}`);
    console.log(`   🗑️ Clientes eliminados: ${totalDeleted}`);
    console.log(`   ✅ Consolidación completada`);
    
  } catch (error) {
    console.error('❌ Error en consolidación:', error);
  }
}

/**
 * Función para mostrar estadísticas después de la consolidación
 */
async function showFinalStats() {
  try {
    console.log('\n📊 ESTADÍSTICAS FINALES');
    console.log('========================\n');
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const allCustomers = await stripe.customers.list({
      limit: 100
    });
    
    const emailCounts = new Map<string, number>();
    let withUserId = 0;
    let withActiveSubscriptions = 0;
    
    for (const customer of allCustomers.data) {
      // Contar emails
      if (customer.email) {
        const count = emailCounts.get(customer.email) || 0;
        emailCounts.set(customer.email, count + 1);
      }
      
      // Contar userId
      if (customer.metadata?.userId) {
        withUserId++;
      }
      
      // Verificar suscripciones activas
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1
      });
      
      if (subscriptions.data.length > 0) {
        withActiveSubscriptions++;
      }
    }
    
    let duplicateEmails = 0;
    for (const count of emailCounts.values()) {
      if (count > 1) {
        duplicateEmails += count;
      }
    }
    
    console.log(`📋 Total de clientes: ${allCustomers.data.length}`);
    console.log(`✅ Con userId en metadata: ${withUserId}`);
    console.log(`🔄 Con suscripciones activas: ${withActiveSubscriptions}`);
    console.log(`📧 Clientes con emails duplicados: ${duplicateEmails}`);
    
    if (duplicateEmails === 0) {
      console.log('\n🎉 ¡No hay más clientes duplicados!');
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas finales:', error);
  }
}

// Ejecutar el script
if (require.main === module) {
  (async () => {
    await consolidateCustomers();
    await showFinalStats();
    process.exit(0);
  })();
}

export { consolidateCustomers, showFinalStats };