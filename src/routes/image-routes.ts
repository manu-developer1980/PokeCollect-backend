import { Router } from 'express';
import { imageController } from '../controllers/image-controller';

const router = Router();

/**
 * @route GET /api/images/status
 * @description Obtiene el estado del sistema de imágenes locales
 * @access Public
 */
router.get('/status', imageController.getImageSystemStatus.bind(imageController));

/**
 * @route POST /api/images/download/set/:setId
 * @description Descarga imágenes para un set específico
 * @param {string} setId - ID del set
 * @body {boolean} downloadSmall - Descargar imágenes pequeñas (default: true)
 * @body {boolean} downloadLarge - Descargar imágenes grandes (default: true)
 * @body {number} maxConcurrent - Número máximo de descargas concurrentes (default: 10)
 * @access Public
 */
router.post('/download/set/:setId', imageController.downloadImagesForSet.bind(imageController));

/**
 * @route POST /api/images/download/sets
 * @description Descarga imágenes para múltiples sets
 * @body {string[]} setIds - Array de IDs de sets
 * @body {boolean} downloadSmall - Descargar imágenes pequeñas (default: true)
 * @body {boolean} downloadLarge - Descargar imágenes grandes (default: true)
 * @body {number} maxConcurrent - Número máximo de descargas concurrentes (default: 10)
 * @access Public
 */
router.post('/download/sets', imageController.downloadImagesForSets.bind(imageController));

/**
 * @route POST /api/images/download/all
 * @description Descarga todas las imágenes disponibles
 * @body {boolean} downloadSmall - Descargar imágenes pequeñas (default: true)
 * @body {boolean} downloadLarge - Descargar imágenes grandes (default: true)
 * @body {number} maxConcurrent - Número máximo de descargas concurrentes (default: 10)
 * @access Public
 */
router.post('/download/all', imageController.downloadAllImages.bind(imageController));

/**
 * @route GET /api/images/check/:cardId
 * @description Verifica si una imagen específica existe localmente
 * @param {string} cardId - ID de la carta
 * @query {string} imageType - Tipo de imagen ('small' o 'large', default: 'small')
 * @access Public
 */
router.get('/check/:cardId', imageController.checkImageExists.bind(imageController));

/**
 * @route GET /api/images/card/:cardId
 * @description Obtiene información de imágenes para una carta específica
 * @param {string} cardId - ID de la carta
 * @access Public
 */
router.get('/card/:cardId', imageController.getCardImageInfo.bind(imageController));

export default router;