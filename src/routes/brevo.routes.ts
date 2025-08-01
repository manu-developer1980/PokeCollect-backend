import { Router } from 'express';
import { BrevoController } from '../controllers/brevo.controller';
import { rateLimiters } from '../lib/rate-limiter';

const router = Router();

// Middleware para configurar headers CORS
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Aplicar rate limiting general a todas las rutas de Brevo
router.use(rateLimiters.general.middleware());

// Rutas de email
router.post('/email/send', 
  rateLimiters.contact.middleware(), // Rate limiting específico para envío de emails
  BrevoController.sendTransactionalEmail
);

router.post('/email/send-template', 
  rateLimiters.contact.middleware(),
  BrevoController.sendTemplateEmail
);

router.post('/email/contact-form', 
  rateLimiters.contact.middleware(),
  BrevoController.sendContactFormEmail
);

// Rutas de plantillas
router.get('/templates', 
  rateLimiters.staticData.middleware(),
  BrevoController.getEmailTemplates
);

// Rutas de contactos
router.post('/contacts', BrevoController.createOrUpdateContact);
router.get('/contacts/:email', BrevoController.getContact);

// Rutas de listas
router.get('/lists', 
  rateLimiters.staticData.middleware(),
  BrevoController.getLists
);

router.post('/lists', BrevoController.createList);
router.post('/lists/:listId/contacts', BrevoController.addContactsToList);

// Rutas de estadísticas
router.get('/statistics', 
  rateLimiters.staticData.middleware(),
  BrevoController.getEmailStatistics
);

export default router;