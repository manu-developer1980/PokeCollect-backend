import { Request, Response } from 'express';
import { autoUpdateService } from '../lib/auto-update-service';

export class AutoUpdateController {
  /**
   * Obtiene el estado actual del sistema de actualización
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = autoUpdateService.getStatus();
      const config = autoUpdateService.getConfig();
      
      res.json({
        success: true,
        data: {
          status,
          config: {
            enabled: config.enabled,
            checkIntervalHours: config.checkIntervalHours,
            repositoryUrl: config.repositoryUrl
          }
        }
      });
    } catch (error) {
      console.error('Error getting auto-update status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get auto-update status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verifica manualmente si hay actualizaciones disponibles
   */
  static async checkUpdates(req: Request, res: Response): Promise<void> {
    try {
      const hasUpdates = await autoUpdateService.forceCheck();
      const status = autoUpdateService.getStatus();
      
      res.json({
        success: true,
        data: {
          hasUpdates,
          status: {
            currentVersion: status.currentVersion,
            latestVersion: status.latestVersion,
            updateAvailable: status.updateAvailable,
            lastCheck: status.lastCheck,
            error: status.error
          }
        }
      });
    } catch (error) {
      console.error('Error checking for updates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check for updates',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Ejecuta una actualización manual
   */
  static async performUpdate(req: Request, res: Response): Promise<void> {
    try {
      const status = autoUpdateService.getStatus();
      
      if (status.isUpdating) {
        res.status(409).json({
          success: false,
          error: 'Update already in progress',
          message: 'An update is currently being performed. Please wait for it to complete.'
        });
        return;
      }

      // Ejecutar actualización en background
      autoUpdateService.forceUpdate().then((success) => {
        if (success) {
          console.log('✅ Manual update completed successfully');
        } else {
          console.log('❌ Manual update failed');
        }
      }).catch((error) => {
        console.error('❌ Manual update error:', error);
      });

      res.json({
        success: true,
        message: 'Update started successfully',
        data: {
          message: 'Update is being performed in the background. Check status endpoint for progress.'
        }
      });
    } catch (error) {
      console.error('Error starting manual update:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start update',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Actualiza la configuración del sistema de actualización
   */
  static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { enabled, checkIntervalHours } = req.body;
      
      const updates: any = {};
      
      if (typeof enabled === 'boolean') {
        updates.enabled = enabled;
      }
      
      if (typeof checkIntervalHours === 'number' && checkIntervalHours > 0) {
        updates.checkIntervalHours = checkIntervalHours;
      }
      
      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid configuration provided',
          message: 'Please provide enabled (boolean) or checkIntervalHours (number > 0)'
        });
        return;
      }
      
      autoUpdateService.updateConfig(updates);
      
      // Reiniciar servicio si se habilitó
      if (updates.enabled) {
        autoUpdateService.start();
      } else if (updates.enabled === false) {
        autoUpdateService.stop();
      }
      
      const newConfig = autoUpdateService.getConfig();
      
      res.json({
        success: true,
        message: 'Configuration updated successfully',
        data: {
          config: {
            enabled: newConfig.enabled,
            checkIntervalHours: newConfig.checkIntervalHours,
            repositoryUrl: newConfig.repositoryUrl
          }
        }
      });
    } catch (error) {
      console.error('Error updating auto-update config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Obtiene el historial de actualizaciones
   */
  static async getUpdateHistory(req: Request, res: Response): Promise<void> {
    try {
      const status = autoUpdateService.getStatus();
      
      // Por ahora solo devolvemos el estado actual
      // En el futuro se podría implementar un historial completo
      const history = {
        lastUpdate: status.lastUpdate,
        lastCheck: status.lastCheck,
        currentVersion: status.currentVersion,
        updates: [
          {
            version: status.currentVersion,
            date: status.lastUpdate,
            status: 'completed'
          }
        ]
      };
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error getting update history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get update history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Health check específico para el sistema de actualización
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const status = autoUpdateService.getStatus();
      const config = autoUpdateService.getConfig();
      
      const health = {
        service: 'Auto-Update Service',
        status: status.isUpdating ? 'updating' : 'healthy',
        enabled: config.enabled,
        currentVersion: status.currentVersion,
        latestVersion: status.latestVersion,
        updateAvailable: status.updateAvailable,
        lastCheck: status.lastCheck,
        lastUpdate: status.lastUpdate,
        error: status.error || null,
        timestamp: new Date().toISOString()
      };
      
      const httpStatus = status.error ? 503 : 200;
      
      res.status(httpStatus).json({
        success: !status.error,
        data: health
      });
    } catch (error) {
      console.error('Error in auto-update health check:', error);
      res.status(500).json({
        success: false,
        error: 'Auto-update health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}