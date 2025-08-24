import Stripe from 'stripe';
import { cacheService } from './cache-service';
import { userService } from './user-service';

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
    aprendiz: {
      id: 'aprendiz',
      name: 'Aprendiz',
      description: 'Plan gratuito para comenzar',
      price: 0,
      currency: 'eur',
      interval: 'month',
      features: ['Hasta 50 cartas', '2 colecciones', '10 cartas en lista de deseos', 'Búsqueda básica'],
      cardLimit: 50,
      collectionLimit: 2,
      wishlistLimit: 10,
      hasAdvancedSearch: false,
      stripePriceId: 'price_1R4KH1EoOyqILXNqxnOSjJHZ'
    },
    entrenador: {
      id: 'entrenador',
      name: 'Entrenador',
      description: 'Para coleccionistas serios',
      price: 5,
      currency: 'eur',
      interval: 'month',
      features: [
        'Hasta 500 cartas',
        '5 colecciones',
        '50 cartas en lista de deseos',
        'Búsqueda avanzada',
        'Estadísticas básicas'
      ],
      cardLimit: 500,
      collectionLimit: 5,
      wishlistLimit: 50,
      hasAdvancedSearch: true,
      stripePriceId: 'price_1R4KGgEoOyqILXNqf6Z2vjqQ'
    },
    maestro: {
      id: 'maestro',
      name: 'Maestro',
      description: 'Para maestros coleccionistas',
      price: 15,
      currency: 'eur',
      interval: 'month',
      features: [
        'Cartas ilimitadas',
        'Colecciones ilimitadas',
        'Lista de deseos ilimitada',
        'Búsqueda avanzada',
        'Estadísticas completas',
        'Soporte prioritario'
      ],
      cardLimit: -1, // Ilimitado
      collectionLimit: -1, // Ilimitado
      wishlistLimit: -1, // Ilimitado
      hasAdvancedSearch: true,
      stripePriceId: 'price_1R4KHlEoOyqILXNqqX7gkWWJ'
    }
  };

  /**
   * Crea una sesión de checkout de Stripe
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
    try {
      const stripeInstance = ensureStripeConfigured();
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
        customer_email: params.userEmail,
        metadata: {
          userId: params.userId,
        },
        subscription_data: {
          metadata: {
            userId: params.userId,
          },
        },
      });

      console.log(`✅ Sesión de checkout creada para usuario ${params.userId}:`, session.id);
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
      // Obtener el plan basado en el price_id
      const planType = this.getPlanTypeFromPriceId(subscription.items.data[0]?.price?.id);
      
      if (planType && subscription.customer) {
        // Aquí necesitaríamos el user_id del metadata o customer
        // Por ahora solo logueamos la información
        console.log(`📝 Nueva suscripción: customer=${subscription.customer}, plan=${planType}`);
      }
    } catch (error) {
      console.error('❌ Error procesando nueva suscripción:', error);
    }
  }

  /**
   * Maneja la actualización de una suscripción
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log(`🔄 Suscripción actualizada: ${subscription.id}`);
    
    try {
      // Obtener el plan basado en el price_id
      const planType = this.getPlanTypeFromPriceId(subscription.items.data[0]?.price?.id);
      
      if (planType) {
        // Buscar usuario por subscription_id
        const user = await userService.getUserByStripeSubscriptionId(subscription.id);
        
        if (user) {
          // Actualizar el plan del usuario
          await userService.updateUserPlan(user.id, planType);
          console.log(`✅ Plan actualizado para usuario ${user.id}: ${planType}`);
        } else {
          console.log(`⚠️ Usuario no encontrado para subscription: ${subscription.id}`);
        }
      } else {
        console.log(`⚠️ Plan no identificado para price_id: ${subscription.items.data[0]?.price?.id}`);
      }
    } catch (error) {
      console.error('❌ Error actualizando plan del usuario:', error);
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
   * Obtiene las características de un plan
   */
  static getPlanFeatures(planId: string): SubscriptionPlan | null {
    return this.SUBSCRIPTION_PLANS[planId] || null;
  }

  /**
   * Obtiene el plan actual del usuario
   */
  static async getUserPlan(userId: string): Promise<string> {
    try {
      return await userService.getUserPlan(userId);
    } catch (error) {
      console.error('❌ Error obteniendo plan del usuario:', error);
      return 'aprendiz'; // Plan por defecto en caso de error
    }
  }

  /**
   * Mapea un price_id de Stripe al tipo de plan correspondiente
   */
  private getPlanTypeFromPriceId(priceId?: string): string | null {
    if (!priceId) return null;
    
    // Mapear los price_id a los tipos de plan
    const priceIdToPlan: Record<string, string> = {
      // Estos price_id deben coincidir con los configurados en Stripe
      'price_aprendiz': 'aprendiz',
      'price_coleccionista': 'coleccionista', 
      'price_maestro': 'maestro'
    };
    
    // Buscar por coincidencia exacta primero
    if (priceIdToPlan[priceId]) {
      return priceIdToPlan[priceId];
    }
    
    // Buscar por coincidencia parcial en el nombre del price_id
    for (const [key, planType] of Object.entries(priceIdToPlan)) {
      if (priceId.includes(planType)) {
        return planType;
      }
    }
    
    console.log(`⚠️ Price ID no reconocido: ${priceId}`);
    return null;
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
    
    console.log('🔍 DEBUG - canPerformAction:');
    console.log('  - Plan ID:', planId);
    console.log('  - Action:', action);
    console.log('  - Current Count:', currentCount);
    console.log('  - Plan Found:', !!plan);
    console.log('  - Plan Details:', plan);
    
    if (!plan) {
      console.log('❌ No plan found for planId:', planId);
      return false;
    }

    let result = false;
    switch (action) {
      case 'addCard':
        result = plan.cardLimit === -1 || (currentCount || 0) < plan.cardLimit;
        console.log(`  - Card check: limit=${plan.cardLimit}, current=${currentCount || 0}, result=${result}`);
        break;
      case 'createCollection':
        result = plan.collectionLimit === -1 || (currentCount || 0) < plan.collectionLimit;
        console.log(`  - Collection check: limit=${plan.collectionLimit}, current=${currentCount || 0}, result=${result}`);
        break;
      case 'addToWishlist':
        result = plan.wishlistLimit === -1 || (currentCount || 0) < plan.wishlistLimit;
        console.log(`  - Wishlist check: limit=${plan.wishlistLimit}, current=${currentCount || 0}, result=${result}`);
        break;
      case 'advancedSearch':
        result = plan.hasAdvancedSearch;
        console.log(`  - Advanced search check: allowed=${plan.hasAdvancedSearch}, result=${result}`);
        break;
      default:
        console.log('❌ Unknown action:', action);
        return false;
    }
    
    console.log('  - Final result:', result);
    return result;
  }
}

// Exportar instancia singleton
export const stripeService = StripeService.getInstance();