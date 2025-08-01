import { Request, Response } from 'express';
import { stripeService, StripeService } from '../lib/stripe-service';
import { rateLimiters } from '../lib/rate-limiter';

/**
 * Controlador para manejar las operaciones de Stripe
 */
export class StripeController {
  /**
   * Obtiene los planes de suscripción disponibles
   */
  static async getSubscriptionPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = StripeService.SUBSCRIPTION_PLANS;
      
      res.json({
        success: true,
        data: Object.values(plans)
      });
    } catch (error) {
      console.error('❌ Error obteniendo planes:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crea una sesión de checkout de Stripe
   */
  static async createCheckoutSession(req: Request, res: Response): Promise<void> {
    try {
      const { priceId, userId, userEmail, successUrl, cancelUrl } = req.body;

      // Validar campos requeridos
      if (!priceId || !userId || !userEmail || !successUrl || !cancelUrl) {
        res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: priceId, userId, userEmail, successUrl, cancelUrl'
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        res.status(400).json({
          success: false,
          error: 'Formato de email inválido'
        });
        return;
      }

      const session = await stripeService.createCheckoutSession({
        priceId,
        userId,
        userEmail,
        successUrl,
        cancelUrl
      });

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          url: session.url
        }
      });
    } catch (error) {
      console.error('❌ Error creando sesión de checkout:', error);
      res.status(500).json({
        success: false,
        error: 'Error creando sesión de pago'
      });
    }
  }

  /**
   * Obtiene información de una suscripción
   */
  static async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          error: 'ID de suscripción requerido'
        });
        return;
      }

      const subscription = await stripeService.getSubscription(subscriptionId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'Suscripción no encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('❌ Error obteniendo suscripción:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo información de suscripción'
      });
    }
  }

  /**
   * Cancela una suscripción
   */
  static async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          error: 'ID de suscripción requerido'
        });
        return;
      }

      const subscription = await stripeService.cancelSubscription(subscriptionId);

      res.json({
        success: true,
        data: subscription,
        message: 'Suscripción marcada para cancelación al final del período actual'
      });
    } catch (error) {
      console.error('❌ Error cancelando suscripción:', error);
      res.status(500).json({
        success: false,
        error: 'Error cancelando suscripción'
      });
    }
  }

  /**
   * Reactiva una suscripción cancelada
   */
  static async reactivateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          error: 'ID de suscripción requerido'
        });
        return;
      }

      const subscription = await stripeService.reactivateSubscription(subscriptionId);

      res.json({
        success: true,
        data: subscription,
        message: 'Suscripción reactivada exitosamente'
      });
    } catch (error) {
      console.error('❌ Error reactivando suscripción:', error);
      res.status(500).json({
        success: false,
        error: 'Error reactivando suscripción'
      });
    }
  }

  /**
   * Obtiene el historial de facturas de un cliente
   */
  static async getCustomerInvoices(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!customerId) {
        res.status(400).json({
          success: false,
          error: 'ID de cliente requerido'
        });
        return;
      }

      if (limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: 'El límite debe estar entre 1 y 100'
        });
        return;
      }

      const invoices = await stripeService.getCustomerInvoices(customerId, limit);

      res.json({
        success: true,
        data: invoices
      });
    } catch (error) {
      console.error('❌ Error obteniendo facturas:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo historial de facturas'
      });
    }
  }

  /**
   * Maneja los webhooks de Stripe
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      if (!signature) {
        res.status(400).json({
          success: false,
          error: 'Firma de Stripe faltante'
        });
        return;
      }

      const event = await stripeService.processWebhook(payload, signature);

      if (!event) {
        res.status(400).json({
          success: false,
          error: 'Error procesando webhook'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Webhook procesado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      res.status(400).json({
        success: false,
        error: 'Error procesando webhook'
      });
    }
  }

  /**
   * Verifica si un usuario puede realizar una acción basada en su plan
   */
  static async checkPlanLimits(req: Request, res: Response): Promise<void> {
    try {
      const { planId, action, currentCount } = req.body;

      if (!planId || !action) {
        res.status(400).json({
          success: false,
          error: 'planId y action son requeridos'
        });
        return;
      }

      const validActions = ['addCard', 'createCollection', 'addToWishlist', 'advancedSearch'];
      if (!validActions.includes(action)) {
        res.status(400).json({
          success: false,
          error: `Acción inválida. Acciones válidas: ${validActions.join(', ')}`
        });
        return;
      }

      const canPerform = StripeService.canPerformAction(planId, action, currentCount);
      const planFeatures = StripeService.getPlanFeatures(planId);

      res.json({
        success: true,
        data: {
          canPerform,
          planFeatures,
          action,
          currentCount: currentCount || 0
        }
      });
    } catch (error) {
      console.error('❌ Error verificando límites del plan:', error);
      res.status(500).json({
        success: false,
        error: 'Error verificando límites del plan'
      });
    }
  }

  /**
   * Obtiene las características de un plan específico
   */
  static async getPlanFeatures(req: Request, res: Response): Promise<void> {
    try {
      const { planId } = req.params;

      if (!planId) {
        res.status(400).json({
          success: false,
          error: 'ID de plan requerido'
        });
        return;
      }

      const planFeatures = StripeService.getPlanFeatures(planId);

      if (!planFeatures) {
        res.status(404).json({
          success: false,
          error: 'Plan no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: planFeatures
      });
    } catch (error) {
      console.error('❌ Error obteniendo características del plan:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo características del plan'
      });
    }
  }
}