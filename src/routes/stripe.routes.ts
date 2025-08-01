import { Router } from 'express';
import { StripeController } from '../controllers/stripe.controller';
import { rateLimiters } from '../lib/rate-limiter';

const router = Router();

// Middleware para configurar headers CORS
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, stripe-signature');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Aplicar rate limiting general a todas las rutas de Stripe
router.use(rateLimiters.general.middleware());

// Rutas públicas (información de planes)
router.get('/plans', StripeController.getSubscriptionPlans);
router.get('/plans/:planId', StripeController.getPlanFeatures);

// Rutas de suscripción (requieren autenticación en producción)
router.post('/checkout/session', 
  rateLimiters.general.middleware(), // Rate limiting adicional para operaciones críticas
  StripeController.createCheckoutSession
);

router.get('/subscription/:subscriptionId', StripeController.getSubscription);
router.put('/subscription/:subscriptionId/cancel', StripeController.cancelSubscription);
router.put('/subscription/:subscriptionId/reactivate', StripeController.reactivateSubscription);

// Rutas de facturación
router.get('/customer/:customerId/invoices', StripeController.getCustomerInvoices);

// Ruta para verificar límites del plan
router.post('/plan/check-limits', StripeController.checkPlanLimits);

// Webhook de Stripe (sin rate limiting para no interferir con Stripe)
router.post('/webhook', StripeController.handleWebhook);

export default router;