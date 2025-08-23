import { Router } from 'express';
import {
  getCardImage,
  checkImageExists,
  migrateCardImage,
  migrateSetImages,
  getMigrationStats,
  testSanityConnection,
  migrateAllImages
} from '../controllers/sanity-image-controller';

const router = Router();

// Obtener imagen de una carta específica
router.get('/card/:cardId', getCardImage);

// Obtener imagen de una carta con tipo específico (small/large)
router.get('/card/:cardId/:imageType', getCardImage);

// Verificar si existe imagen para una carta
router.get('/check/:cardId', checkImageExists);

// Migrar imagen de una carta específica
router.post('/migrate/card/:cardId', migrateCardImage);

// Migrar todas las imágenes de un set
router.post('/migrate/set/:setId', migrateSetImages);

// Migrar todas las imágenes (proceso completo)
router.post('/migrate/all', migrateAllImages);

// Obtener estadísticas de migración
router.get('/stats', getMigrationStats);

// Probar conexión con Sanity
router.get('/test', testSanityConnection);

export default router;