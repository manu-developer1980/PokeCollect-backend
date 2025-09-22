import Stripe from 'stripe';
import { cacheService } from './cache-service';

// Inicializar Stripe solo si hay clave API
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-07-30.basil',
}) : null;

// Helper para verificar si Stripe está configurado
function ensureStripeConfigured(): Stripe {
  if (!stripe) {
    throw new Error('Stripe no está configurado. Verifica que STRIPE_SECRET_KEY esté definida en las variables de entorno.');
  }
  return stripe;
}

// Tipos para TypeScript
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  cardLimit: number;
  collectionLimit: number;
  wishlistLimit: number;
  hasAdvancedSearch: boolean;
  stripePriceId: string;
}

interface CreateCheckoutSessionParams {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

interface WebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

/**
 * Servicio centralizado para manejar Stripe
 */
export class StripeService {
  private static instance: StripeService;

  private constructor() {}

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Planes de suscripción disponibles
   */
  static readonly SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
    free: {
      id: 'free',
      name: 'Gratuito',
      description: 'Plan básico para comenzar',
      price: 0,
      currency: 'eur',
      interval: 'month',
      features: ['Búsqueda básica', 'Colección personal'],
      cardLimit: 100,
      collectionLimit: 3,
      wishlistLimit: 50,
      hasAdvancedSearch: false,
      stripePriceId: ''
    },
    entrenador: {
      id: 'entrenador',
      name: 'Entrenador',
      description: 'Plan intermedio para coleccionistas activos',
      price: 4.99,
      currency: 'eur',
      interval: 'month',
      features: [
        'Búsqueda avanzada básica',
        'Colecciones extendidas',
        'Lista de deseos ampliada',
        'Estadísticas básicas'
      ],
      cardLimit: 500,
      collectionLimit: 10,
      wishlistLimit: 200,
      hasAdvancedSearch: true,
      stripePriceId: process.env.STRIPE_ENTRENADOR_PRICE_ID || ''
    },
    maestro: {
      id: 'maestro',
      name: 'Maestro',
      description: 'Plan premium para maestros coleccionistas',
      price: 9.99,
      currency: 'eur',
      interval: 'month',
      features: [
        'Búsqueda avanzada completa',
        'Colecciones ilimitadas',
        'Lista de deseos ilimitada',
        'Estadísticas detalladas',
        'Soporte prioritario',
        'Análisis de mercado'
      ],
      cardLimit: -1, // Ilimitado
      collectionLimit: -1, // Ilimitado
      wishlistLimit: -1, // Ilimitado
      hasAdvancedSearch: true,
      stripePriceId: process.env.STRIPE_MAESTRO_PRICE_ID || ''
    },
    premium: {
      id: 'premium',
      name: 'Premium',
      description: 'Plan avanzado con todas las funcionalidades (legacy)',
      price: 9.99,
      currency: 'eur',
      interval: 'month',
      features: [
        'Búsqueda avanzada',
        'Colecciones ilimitadas',
        'Lista de deseos extendida',
        'Estadísticas detalladas',
        'Soporte prioritario'
      ],
      cardLimit: -1, // Ilimitado
      collectionLimit: -1, // Ilimitado
      wishlistLimit: -1, // Ilimitado
      hasAdvancedSearch: true,
      stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || ''
    }
  };

  /**
   * Busca o crea un cliente en Stripe
   */
  private async findOrCreateCustomer(userId: string, userEmail: string): Promise<string> {
    try {
      const stripeInstance = ensureStripeConfigured();
      
      // Primero buscar por userId en metadata
      const customersByMetadata = await stripeInstance.customers.list({
        limit: 100,
      });
      
      let existingCustomer = null;
      for (const customer of customersByMetadata.data) {
        if (customer.metadata?.userId === userId) {
          existingCustomer = customer;
          break;
        }
      }
      
      if (existingCustomer) {
        console.log(`✅ Cliente existente encontrado por userId: ${existingCustomer.id}`);
        return existingCustomer.id;
      }
      
      // Si no se encuentra por userId, buscar TODOS los customers por email
      const customersByEmail = await stripeInstance.customers.list({
        email: userEmail,
        limit: 100 // Obtener todos los customers con este email
      });
      
      if (customersByEmail.data.length > 0) {
        // Buscar si alguno ya tiene el userId correcto
        const customerWithUserId = customersByEmail.data.find(c => c.metadata?.userId === userId);
        
        if (customerWithUserId) {
          console.log(`✅ Cliente existente encontrado por email con userId correcto: ${customerWithUserId.id}`);
          return customerWithUserId.id;
        }
        
        // Si hay múltiples customers, usar el más antiguo y actualizar su metadata
        const oldestCustomer = customersByEmail.data.reduce((oldest, current) => 
          current.created < oldest.created ? current : oldest
        );
        
        // Actualizar metadata con userId
        await stripeInstance.customers.update(oldestCustomer.id, {
          metadata: {
            ...oldestCustomer.metadata,
            userId: userId
          }
        });
        
        console.log(`✅ Cliente más antiguo encontrado por email y actualizado con userId: ${oldestCustomer.id}`);
        
        // Si hay customers duplicados, marcarlos para limpieza posterior
        if (customersByEmail.data.length > 1) {
          console.log(`⚠️ Se encontraron ${customersByEmail.data.length} customers duplicados para ${userEmail}`);
          const duplicates = customersByEmail.data.filter(c => c.id !== oldestCustomer.id);
          
          for (const duplicate of duplicates) {
            console.log(`   - Duplicado: ${duplicate.id} (creado: ${new Date(duplicate.created * 1000).toLocaleString()})`);
          }
        }
        
        return oldestCustomer.id;
      }
      
      // Si no existe, crear nuevo cliente
      const newCustomer = await stripeInstance.customers.create({
        email: userEmail,
        metadata: {
          userId: userId
        }
      });
      
      console.log(`✅ Nuevo cliente creado: ${newCustomer.id}`);
      return newCustomer.id;
      
    } catch (error) {
      console.error('❌ Error buscando o creando cliente:', error);
      throw error;
    }
  }

  /**
   * Crea una sesión de checkout de Stripe
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
    try {
      const stripeInstance = ensureStripeConfigured();
      
      // Buscar o crear cliente para evitar duplicados
      const customerId = await this.findOrCreateCustomer(params.userId, params.userEmail);
      
      const session = await stripeInstance.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer: customerId, // Usar customer ID en lugar de customer_email
        metadata: {
          userId: params.userId,
        },
        subscription_data: {
          metadata: {
            userId: params.userId,
          },
        },
      });

      console.log(`✅ Sesión de checkout creada para usuario ${params.userId} con cliente ${customerId}:`, session.id);
      return session;
    } catch (error) {
      console.error('❌ Error creando sesión de checkout:', error);
      throw error;
    }
  }

  /**
   * Obtiene información de una suscripción
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      const cacheKey = `stripe:subscription:${subscriptionId}`;
      
      // Intentar obtener del caché primero
      const cachedSubscription = cacheService.get<Stripe.Subscription>(cacheKey);
      if (cachedSubscription) {
        console.log(`🎯 Suscripción ${subscriptionId} devuelta desde caché`);
        return cachedSubscription;
      }

      const stripeInstance = ensureStripeConfigured();
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
      
      // Guardar en caché por 5 minutos
      cacheService.set(cacheKey, subscription, 300);
      console.log(`💾 Suscripción ${subscriptionId} guardada en caché`);
      
      return subscription;
    } catch (error) {
      console.error(`❌ Error obteniendo suscripción ${subscriptionId}:`, error);
      return null;
    }
  }

  /**
   * Cancela una suscripción
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const stripeInstance = ensureStripeConfigured();
      const subscription = await stripeInstance.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      // Limpiar caché
      const cacheKey = `stripe:subscription:${subscriptionId}`;
      cacheService.del(cacheKey);

      console.log(`✅ Suscripción ${subscriptionId} marcada para cancelación`);
      return subscription;
    } catch (error) {
      console.error(`❌ Error cancelando suscripción ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Reactiva una suscripción cancelada
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const stripeInstance = ensureStripeConfigured();
      const subscription = await stripeInstance.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // Limpiar caché
      const cacheKey = `stripe:subscription:${subscriptionId}`;
      cacheService.del(cacheKey);

      console.log(`✅ Suscripción ${subscriptionId} reactivada`);
      return subscription;
    } catch (error) {
      console.error(`❌ Error reactivando suscripción ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de facturas de un cliente
   */
  async getCustomerInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    try {
      const cacheKey = `stripe:invoices:${customerId}:${limit}`;
      
      // Intentar obtener del caché primero
      const cachedInvoices = cacheService.get<Stripe.Invoice[]>(cacheKey);
      if (cachedInvoices) {
        console.log(`🎯 Facturas del cliente ${customerId} devueltas desde caché`);
        return cachedInvoices;
      }

      const stripeInstance = ensureStripeConfigured();
      const invoices = await stripeInstance.invoices.list({
        customer: customerId,
        limit,
      });

      // Guardar en caché por 10 minutos
      cacheService.set(cacheKey, invoices.data, 600);
      console.log(`💾 Facturas del cliente ${customerId} guardadas en caché`);
      
      return invoices.data;
    } catch (error) {
      console.error(`❌ Error obteniendo facturas del cliente ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene todas las suscripciones activas de un cliente
   */
  async getCustomerActiveSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const cacheKey = `stripe:active_subscriptions:${customerId}`;
      
      // Intentar obtener del caché primero
      const cachedSubscriptions = cacheService.get<Stripe.Subscription[]>(cacheKey);
      if (cachedSubscriptions) {
        console.log(`🎯 Suscripciones activas del cliente ${customerId} devueltas desde caché`);
        return cachedSubscriptions;
      }

      const stripeInstance = ensureStripeConfigured();
      const subscriptions = await stripeInstance.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 100, // Obtener todas las suscripciones activas
      });

      // Guardar en caché por 5 minutos
      cacheService.set(cacheKey, subscriptions.data, 300);
      console.log(`💾 ${subscriptions.data.length} suscripciones activas del cliente ${customerId} guardadas en caché`);
      
      return subscriptions.data;
    } catch (error) {
      console.error(`❌ Error obteniendo suscripciones activas del cliente ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Cancela todas las suscripciones activas de un cliente excepto la especificada
   */
  async cancelOtherActiveSubscriptions(customerId: string, keepSubscriptionId?: string): Promise<void> {
    try {
      const activeSubscriptions = await this.getCustomerActiveSubscriptions(customerId);
      
      // Filtrar suscripciones a cancelar (todas excepto la que queremos mantener)
      const subscriptionsToCancel = activeSubscriptions.filter(sub => 
        sub.id !== keepSubscriptionId && sub.status === 'active'
      );

      if (subscriptionsToCancel.length === 0) {
        console.log(`ℹ️ No hay suscripciones adicionales que cancelar para el cliente ${customerId}`);
        return;
      }

      console.log(`🔄 Cancelando ${subscriptionsToCancel.length} suscripciones activas para el cliente ${customerId}`);
      
      // Cancelar cada suscripción inmediatamente (no al final del período)
      const stripeInstance = ensureStripeConfigured();
      const cancelPromises = subscriptionsToCancel.map(async (subscription) => {
        try {
          await stripeInstance.subscriptions.cancel(subscription.id);
          console.log(`✅ Suscripción ${subscription.id} cancelada exitosamente`);
        } catch (error) {
          console.error(`❌ Error cancelando suscripción ${subscription.id}:`, error);
          throw error;
        }
      });

      await Promise.all(cancelPromises);
      
      // Limpiar caché de suscripciones activas
      const cacheKey = `stripe:active_subscriptions:${customerId}`;
      cacheService.del(cacheKey);
      
      console.log(`✅ Todas las suscripciones anteriores del cliente ${customerId} han sido canceladas`);
    } catch (error) {
      console.error(`❌ Error cancelando suscripciones del cliente ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Crea una nueva suscripción y cancela automáticamente las anteriores
   */
  async createCheckoutSessionWithSubscriptionManagement(params: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
    try {
      // Primero crear la sesión de checkout normal
      const session = await this.createCheckoutSession(params);
      
      // Almacenar información para manejar la cancelación después del pago exitoso
      // Esto se manejará en el webhook de subscription.created
      console.log(`✅ Sesión de checkout creada: ${session.id}`);
      console.log(`ℹ️ Las suscripciones anteriores se cancelarán automáticamente después del pago exitoso`);
      
      return session;
    } catch (error) {
      console.error(`❌ Error creando sesión de checkout con manejo de suscripciones:`, error);
      throw error;
    }
  }

  /**
   * Verifica y procesa un webhook de Stripe
   */
  async processWebhook(payload: string, signature: string): Promise<WebhookEvent | null> {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET no configurado');
      }

      const stripeInstance = ensureStripeConfigured();
      const event = stripeInstance.webhooks.constructEvent(payload, signature, endpointSecret);
      
      console.log(`📨 Webhook recibido: ${event.type}`);
      
      // Procesar diferentes tipos de eventos
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`⚠️ Evento no manejado: ${event.type}`);
      }

      return event;
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      return null;
    }
  }

  /**
   * Maneja la creación de una nueva suscripción
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log(`🎉 Nueva suscripción creada: ${subscription.id}`);
    
    try {
      // Obtener el customer ID de la suscripción
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id;
      
      if (customerId) {
        // Cancelar automáticamente todas las otras suscripciones activas del cliente
        console.log(`🔄 Verificando suscripciones anteriores para el cliente ${customerId}`);
        await this.cancelOtherActiveSubscriptions(customerId, subscription.id);
        
        console.log(`✅ Procesamiento completo de nueva suscripción ${subscription.id}`);
      } else {
        console.warn(`⚠️ No se pudo obtener el customer ID de la suscripción ${subscription.id}`);
      }
    } catch (error) {
      console.error(`❌ Error procesando nueva suscripción ${subscription.id}:`, error);
      // No lanzar el error para evitar que falle el webhook
    }
    
    // Aquí se podría actualizar la base de datos del usuario
    // Por ejemplo, actualizar el plan en Supabase
  }

  /**
   * Maneja la actualización de una suscripción
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log(`🔄 Suscripción actualizada: ${subscription.id}`);
    
    try {
      // Obtener el customer ID de la suscripción
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id;
      
      if (customerId) {
        // Cancelar automáticamente todas las otras suscripciones activas del cliente
        console.log(`🔄 Verificando suscripciones anteriores para el cliente ${customerId} (actualización)`);
        await this.cancelOtherActiveSubscriptions(customerId, subscription.id);
        
        console.log(`✅ Procesamiento completo de actualización de suscripción ${subscription.id}`);
      } else {
        console.warn(`⚠️ No se pudo obtener el customer ID de la suscripción actualizada ${subscription.id}`);
      }
    } catch (error) {
      console.error(`❌ Error procesando actualización de suscripción ${subscription.id}:`, error);
      // No lanzar el error para evitar que falle el webhook
    }
    
    // Limpiar caché de la suscripción
    const cacheKey = `stripe:subscription:${subscription.id}`;
    cacheService.del(cacheKey);
  }

  /**
   * Maneja la eliminación de una suscripción
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log(`🗑️ Suscripción eliminada: ${subscription.id}`);
    
    // Limpiar caché de la suscripción
    const cacheKey = `stripe:subscription:${subscription.id}`;
    cacheService.del(cacheKey);
  }

  /**
   * Maneja un pago exitoso
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log(`💰 Pago exitoso para factura: ${invoice.id}`);
    // Aquí se podría enviar un email de confirmación
  }

  /**
   * Maneja un pago fallido
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log(`❌ Pago fallido para factura: ${invoice.id}`);
    // Aquí se podría enviar un email de notificación
  }

  /**
   * Obtiene el plan actual de un usuario basado en sus suscripciones activas
   */
  async getUserCurrentPlan(userId: string): Promise<SubscriptionPlan> {
    try {
      const stripe = ensureStripeConfigured();
      
      // Buscar cliente por metadata userId
      const customers = await stripe.customers.list({
        limit: 1,
        expand: ['data.subscriptions']
      });
      
      let customer = null;
      for (const cust of customers.data) {
        if (cust.metadata?.userId === userId) {
          customer = cust;
          break;
        }
      }
      
      if (!customer) {
        console.log(`👤 Usuario ${userId} no tiene cliente en Stripe, devolviendo plan gratuito`);
        return StripeService.SUBSCRIPTION_PLANS.free;
      }
      
      // Obtener suscripciones activas del cliente
      const activeSubscriptions = await this.getCustomerActiveSubscriptions(customer.id);
      
      if (activeSubscriptions.length === 0) {
        console.log(`📋 Usuario ${userId} no tiene suscripciones activas, devolviendo plan gratuito`);
        return StripeService.SUBSCRIPTION_PLANS.free;
      }
      
      // Obtener la suscripción más reciente (por si hay múltiples)
      const latestSubscription = activeSubscriptions.sort((a, b) => b.created - a.created)[0];
      
      // Obtener el price ID de la suscripción
      const priceId = latestSubscription.items.data[0]?.price?.id;
      
      if (!priceId) {
        console.log(`⚠️ No se pudo obtener price ID para usuario ${userId}, devolviendo plan gratuito`);
        return StripeService.SUBSCRIPTION_PLANS.free;
      }
      
      // Mapear price ID a plan
      const planId = this.getPlanIdFromPriceId(priceId);
      const plan = StripeService.SUBSCRIPTION_PLANS[planId as keyof typeof StripeService.SUBSCRIPTION_PLANS];
      
      if (!plan) {
        console.log(`⚠️ Plan no encontrado para price ID ${priceId}, devolviendo plan gratuito`);
        return StripeService.SUBSCRIPTION_PLANS.free;
      }
      
      console.log(`✅ Usuario ${userId} tiene plan activo: ${plan.name}`);
      return plan;
      
    } catch (error) {
      console.error(`❌ Error obteniendo plan del usuario ${userId}:`, error);
      // En caso de error, devolver plan gratuito por seguridad
      return StripeService.SUBSCRIPTION_PLANS.free;
    }
  }
  
  /**
   * Mapea un price ID de Stripe a un plan ID interno
   */
  private getPlanIdFromPriceId(priceId: string): string {
    for (const [planId, plan] of Object.entries(StripeService.SUBSCRIPTION_PLANS)) {
      if (plan.stripePriceId === priceId) {
        return planId;
      }
    }
    return 'free'; // Default fallback
  }

  /**
   * Obtiene las características de un plan
   */
  static getPlanFeatures(planId: string): SubscriptionPlan | null {
    return StripeService.SUBSCRIPTION_PLANS[planId] || null;
  }

  /**
   * Verifica si un usuario puede realizar una acción basada en su plan
   */
  static canPerformAction(
    planId: string,
    action: 'addCard' | 'createCollection' | 'addToWishlist' | 'advancedSearch',
    currentCount?: number
  ): boolean {
    const plan = this.getPlanFeatures(planId);
    if (!plan) return false;

    switch (action) {
      case 'addCard':
        return plan.cardLimit === -1 || (currentCount || 0) < plan.cardLimit;
      case 'createCollection':
        return plan.collectionLimit === -1 || (currentCount || 0) < plan.collectionLimit;
      case 'addToWishlist':
        return plan.wishlistLimit === -1 || (currentCount || 0) < plan.wishlistLimit;
      case 'advancedSearch':
        return plan.hasAdvancedSearch;
      default:
        return false;
    }
  }
}

// Exportar instancia singleton
export const stripeService = StripeService.getInstance();