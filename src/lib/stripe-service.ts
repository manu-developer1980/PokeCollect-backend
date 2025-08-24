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

      // Sesión de checkout creada exitosamente
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
        // Suscripción obtenida desde caché
        return cachedSubscription;
      }

      const stripeInstance = ensureStripeConfigured();
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
      
      // Guardar en caché por 5 minutos
      cacheService.set(cacheKey, subscription, 300);
      // Suscripción guardada en caché
      
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

      // Suscripción marcada para cancelación
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

      // Suscripción reactivada
      return subscription;
    } catch (error) {
      console.error(`❌ Error reactivando suscripción ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza una suscripción existente a un nuevo plan
   */
  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<Stripe.Subscription> {
    try {
      const stripeInstance = ensureStripeConfigured();
      
      // Obtener la suscripción actual
      const currentSubscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
      
      if (!currentSubscription) {
        throw new Error(`Suscripción ${subscriptionId} no encontrada`);
      }

      // Actualizar la suscripción con el nuevo precio
      const updatedSubscription = await stripeInstance.subscriptions.update(subscriptionId, {
        items: [{
          id: currentSubscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations', // Crear prorrateo automático
      });

      // Limpiar caché
      const cacheKey = `stripe:subscription:${subscriptionId}`;
      cacheService.del(cacheKey);

      // Suscripción actualizada al nuevo precio
      return updatedSubscription;
    } catch (error) {
      console.error(`❌ Error actualizando suscripción ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene la suscripción activa de un usuario
   */
  async getUserActiveSubscription(userId: string): Promise<Stripe.Subscription | null> {
    try {
      const user = await userService.getUserById(userId);
      
      if (!user || !user.stripe_subscription_id) {
        return null;
      }

      const subscription = await this.getSubscription(user.stripe_subscription_id);
      
      // Verificar que la suscripción esté activa
      if (subscription && subscription.status === 'active') {
        return subscription;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo suscripción activa del usuario ${userId}:`, error);
      return null;
    }
  }

  /**
   * Verifica si un usuario tiene una suscripción activa
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserActiveSubscription(userId);
    return subscription !== null;
  }

  /**
   * Cancela todas las suscripciones activas de un usuario
   * Útil como medida de seguridad antes de crear una nueva suscripción
   */
  async cancelAllUserSubscriptions(userId: string): Promise<void> {
    try {
      const user = await userService.getUserById(userId);
      
      if (!user || !user.stripe_customer_id) {
        // Usuario sin customer ID de Stripe
        return;
      }

      const stripeInstance = ensureStripeConfigured();
      
      // Obtener todas las suscripciones del cliente
      const subscriptions = await stripeInstance.subscriptions.list({
        customer: user.stripe_customer_id,
        status: 'active'
      });

      if (subscriptions.data.length === 0) {
        // Usuario sin suscripciones activas
        return;
      }

      // Cancelar todas las suscripciones activas
      for (const subscription of subscriptions.data) {
        await this.cancelSubscription(subscription.id);
        // Suscripción cancelada
      }

      // Todas las suscripciones canceladas
    } catch (error) {
      console.error(`❌ Error cancelando suscripciones del usuario ${userId}:`, error);
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
        // Facturas obtenidas desde caché
        return cachedInvoices;
      }

      const stripeInstance = ensureStripeConfigured();
      const invoices = await stripeInstance.invoices.list({
        customer: customerId,
        limit,
      });

      // Guardar en caché por 10 minutos
      cacheService.set(cacheKey, invoices.data, 600);
      // Facturas guardadas en caché
      
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
      
      let event;
      
      // En desarrollo, saltarse la verificación de firma si no hay secret configurado
      if (!endpointSecret || process.env.NODE_ENV === 'development') {
        // Modo desarrollo: saltando verificación de firma de webhook
        event = JSON.parse(payload);
      } else {
        const stripeInstance = ensureStripeConfigured();
        event = stripeInstance.webhooks.constructEvent(payload, signature, endpointSecret);
      }
      
      // Webhook recibido
      
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
          // Evento no manejado
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
    // Nueva suscripción creada
    
    try {
      // Obtener el plan basado en el price_id
      const planType = this.getPlanTypeFromPriceId(subscription.items.data[0]?.price?.id);
      
      if (planType && subscription.customer) {
        // Nueva suscripción registrada
        
        // Buscar usuario por customer_id
        const user = await userService.getUserByStripeCustomerId(subscription.customer as string);
        
        if (user) {
          // Usuario encontrado
          
          // Cancelar todas las suscripciones anteriores del usuario (excepto la nueva)
          try {
            const stripeInstance = ensureStripeConfigured();
            const existingSubscriptions = await stripeInstance.subscriptions.list({
              customer: subscription.customer as string,
              status: 'active'
            });
            
            // Filtrar para excluir la suscripción recién creada
            const subscriptionsToCancel = existingSubscriptions.data.filter(
              sub => sub.id !== subscription.id
            );
            
            if (subscriptionsToCancel.length > 0) {
              // Cancelando suscripciones anteriores
              
              for (const oldSubscription of subscriptionsToCancel) {
                await this.cancelSubscription(oldSubscription.id);
                // Suscripción anterior cancelada
              }
            }
            
            // Actualizar el plan del usuario
            await userService.updateUserPlan(user.id, planType);
            // Plan actualizado
            
          } catch (cancelError) {
            console.error('❌ Error cancelando suscripciones anteriores:', cancelError);
            // No lanzamos el error para no interrumpir el proceso principal
          }
        } else {
          // Usuario no encontrado para customer
        }
      }
    } catch (error) {
      console.error('❌ Error procesando nueva suscripción:', error);
    }
  }

  /**
   * Maneja la actualización de una suscripción
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    // Suscripción actualizada
    
    try {
      // Obtener el plan basado en el price_id
      const planType = this.getPlanTypeFromPriceId(subscription.items.data[0]?.price?.id);
      
      if (planType) {
        // Buscar usuario por subscription_id
        const user = await userService.getUserByStripeSubscriptionId(subscription.id);
        
        if (user) {
          // Actualizar el plan del usuario
          await userService.updateUserPlan(user.id, planType);
          // Plan actualizado para usuario
        } else {
          // Usuario no encontrado para suscripción
        }
      } else {
        // Plan no identificado para price_id
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
    // Suscripción eliminada
    
    // Limpiar caché de la suscripción
    const cacheKey = `stripe:subscription:${subscription.id}`;
    cacheService.del(cacheKey);
  }

  /**
   * Maneja un pago exitoso
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Pago exitoso
    // Aquí se podría enviar un email de confirmación
  }

  /**
   * Maneja un pago fallido
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Pago fallido
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
    
    // Mapear los price_id reales de Stripe a los tipos de plan
    const priceIdToPlan: Record<string, string> = {
      // Price IDs reales de Stripe
      'price_1R4KH1EoOyqILXNqxnOSjJHZ': 'aprendiz',
      'price_1R4KGgEoOyqILXNqf6Z2vjqQ': 'entrenador',
      'price_1R4KHlEoOyqILXNqqX7gkWWJ': 'maestro'
    };
    
    // Buscar por coincidencia exacta
    const planType = priceIdToPlan[priceId];
    if (planType) {
      return planType;
    }
    
    // Si no se encuentra, verificar si es un status de suscripción
    if (priceId === 'active' || priceId === 'canceled' || priceId === 'incomplete') {
      // Status de suscripción recibido en lugar de Price ID
      return 'aprendiz'; // Fallback al plan gratuito
    }
    
    // Price ID no reconocido
    return 'aprendiz'; // Fallback al plan gratuito en lugar de null
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
    
    // Verificando permisos de acción para el plan
    
    if (!plan) {
      // Plan no encontrado
      return false;
    }

    let result = false;
    switch (action) {
      case 'addCard':
        result = plan.cardLimit === -1 || (currentCount || 0) < plan.cardLimit;
        // Verificando límite de cartas
        break;
      case 'createCollection':
        result = plan.collectionLimit === -1 || (currentCount || 0) < plan.collectionLimit;
        // Verificando límite de colecciones
        break;
      case 'addToWishlist':
        result = plan.wishlistLimit === -1 || (currentCount || 0) < plan.wishlistLimit;
        // Verificando límite de wishlist
        break;
      case 'advancedSearch':
        result = plan.hasAdvancedSearch;
        // Verificando búsqueda avanzada
        break;
      default:
        // Acción desconocida
        return false;
    }
    
    // Resultado final de verificación
    return result;
  }
}

// Exportar instancia singleton
export const stripeService = StripeService.getInstance();