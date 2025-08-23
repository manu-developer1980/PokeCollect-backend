import { Router } from 'express';
import { AutoUpdateController } from '../controllers/auto-update.controller';

const router = Router();

/**
 * @route GET /api/auto-update/status
 * @desc Obtiene el estado actual del sistema de actualización automática
 * @access Public
 */
router.get('/status', AutoUpdateController.getStatus);

/**
 * @route GET /api/auto-update/health
 * @desc Health check del sistema de actualización automática
 * @access Public
 */
router.get('/health', AutoUpdateController.healthCheck);

/**
 * @route POST /api/auto-update/check
 * @desc Verifica manualmente si hay actualizaciones disponibles
 * @access Public
 */
router.post('/check', AutoUpdateController.checkUpdates);

/**
 * @route POST /api/auto-update/update
 * @desc Ejecuta una actualización manual de los datos
 * @access Public
 */
router.post('/update', AutoUpdateController.performUpdate);

/**
 * @route PUT /api/auto-update/config
 * @desc Actualiza la configuración del sistema de actualización
 * @body { enabled?: boolean, checkIntervalHours?: number }
 * @access Public
 */
router.put('/config', AutoUpdateController.updateConfig);

/**
 * @route GET /api/auto-update/history
 * @desc Obtiene el historial de actualizaciones
 * @access Public
 */
router.get('/history', AutoUpdateController.getUpdateHistory);

export default router;