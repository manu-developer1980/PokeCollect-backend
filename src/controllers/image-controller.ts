import { Request, Response } from 'express';
import { imageDownloadService, ImageDownloadOptions, DownloadProgress } from '../lib/image-download-service';
import { localPokemonData } from '../lib/local-pokemon-data';
import path from 'path';
import fs from 'fs/promises';

export class ImageController {
  /**
   * Obtiene el estado del sistema de imágenes locales
   */
  async getImageSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const stats = imageDownloadService.getStats();
      
      // Verificar si existen los directorios de imágenes
      const baseImagePath = 'public/images';
      const smallDirExists = await this.directoryExists(path.join(baseImagePath, 'small'));
      const largeDirExists = await this.directoryExists(path.join(baseImagePath, 'large'));
      
      // Contar archivos existentes
      const smallImageCount = smallDirExists ? await this.countFilesInDirectory(path.join(baseImagePath, 'small')) : 0;
      const largeImageCount = largeDirExists ? await this.countFilesInDirectory(path.join(baseImagePath, 'large')) : 0;
      
      res.json({
        success: true,
        data: {
          systemStatus: 'operational',
          directories: {
            small: {
              exists: smallDirExists,
              imageCount: smallImageCount,
              path: path.join(baseImagePath, 'small')
            },
            large: {
              exists: largeDirExists,
              imageCount: largeImageCount,
              path: path.join(baseImagePath, 'large')
            }
          },
          lastDownloadStats: stats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting image system status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get image system status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Descarga imágenes para un set específico
   */
  async downloadImagesForSet(req: Request, res: Response): Promise<void> {
    try {
      const { setId } = req.params;
      const {
        downloadSmall = true,
        downloadLarge = true,
        maxConcurrent = 10
      } = req.body;

      if (!setId) {
        res.status(400).json({
          success: false,
          error: 'Set ID is required'
        });
        return;
      }

      // Obtener cartas del set
      const cards = await localPokemonData.getCardsBySet(setId);
      
      if (!cards || cards.length === 0) {
        res.status(404).json({
          success: false,
          error: `No cards found for set: ${setId}`
        });
        return;
      }

      const progressUpdates: DownloadProgress[] = [];
      
      const options: ImageDownloadOptions = {
        downloadSmall,
        downloadLarge,
        maxConcurrent,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      };

      const stats = await imageDownloadService.downloadImagesFromCards(cards, options);

      res.json({
        success: true,
        data: {
          setId,
          cardCount: cards.length,
          downloadStats: stats,
          progressSummary: {
            totalUpdates: progressUpdates.length,
            successCount: progressUpdates.filter(p => p.status === 'success').length,
            errorCount: progressUpdates.filter(p => p.status === 'error').length,
            skippedCount: progressUpdates.filter(p => p.status === 'skipped').length
          }
        }
      });
    } catch (error) {
      console.error('Error downloading images for set:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download images for set',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Descarga imágenes para múltiples sets
   */
  async downloadImagesForSets(req: Request, res: Response): Promise<void> {
    try {
      const {
        setIds,
        downloadSmall = true,
        downloadLarge = true,
        maxConcurrent = 10
      } = req.body;

      if (!setIds || !Array.isArray(setIds) || setIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Set IDs array is required'
        });
        return;
      }

      const allCards: any[] = [];
      const setResults: any[] = [];

      // Recopilar cartas de todos los sets
      for (const setId of setIds) {
        try {
          const cards = await localPokemonData.getCardsBySet(setId);
          if (cards && cards.length > 0) {
            allCards.push(...cards);
            setResults.push({
              setId,
              cardCount: cards.length,
              status: 'found'
            });
          } else {
            setResults.push({
              setId,
              cardCount: 0,
              status: 'not_found'
            });
          }
        } catch (error) {
          setResults.push({
            setId,
            cardCount: 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (allCards.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No cards found for any of the specified sets',
          setResults
        });
        return;
      }

      const progressUpdates: DownloadProgress[] = [];
      
      const options: ImageDownloadOptions = {
        downloadSmall,
        downloadLarge,
        maxConcurrent,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      };

      const stats = await imageDownloadService.downloadImagesFromCards(allCards, options);

      res.json({
        success: true,
        data: {
          setIds,
          setResults,
          totalCardCount: allCards.length,
          downloadStats: stats,
          progressSummary: {
            totalUpdates: progressUpdates.length,
            successCount: progressUpdates.filter(p => p.status === 'success').length,
            errorCount: progressUpdates.filter(p => p.status === 'error').length,
            skippedCount: progressUpdates.filter(p => p.status === 'skipped').length
          }
        }
      });
    } catch (error) {
      console.error('Error downloading images for sets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download images for sets',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Descarga todas las imágenes disponibles
   */
  async downloadAllImages(req: Request, res: Response): Promise<void> {
    try {
      const {
        downloadSmall = true,
        downloadLarge = true,
        maxConcurrent = 10
      } = req.body;

      // Obtener todos los sets disponibles
      const sets = await localPokemonData.getSets();
      
      if (!sets || sets.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No sets found'
        });
        return;
      }

      const allCards: any[] = [];
      const setResults: any[] = [];

      // Recopilar cartas de todos los sets
      for (const set of sets) {
        try {
          const cards = await localPokemonData.getCardsBySet(set.id);
          if (cards && cards.length > 0) {
            allCards.push(...cards);
            setResults.push({
              setId: set.id,
              setName: set.name,
              cardCount: cards.length,
              status: 'processed'
            });
          }
        } catch (error) {
          setResults.push({
            setId: set.id,
            setName: set.name,
            cardCount: 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (allCards.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No cards found in any set'
        });
        return;
      }

      const progressUpdates: DownloadProgress[] = [];
      
      const options: ImageDownloadOptions = {
        downloadSmall,
        downloadLarge,
        maxConcurrent,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      };

      const stats = await imageDownloadService.downloadImagesFromCards(allCards, options);

      res.json({
        success: true,
        data: {
          totalSets: sets.length,
          processedSets: setResults.filter(s => s.status === 'processed').length,
          totalCardCount: allCards.length,
          downloadStats: stats,
          setResults,
          progressSummary: {
            totalUpdates: progressUpdates.length,
            successCount: progressUpdates.filter(p => p.status === 'success').length,
            errorCount: progressUpdates.filter(p => p.status === 'error').length,
            skippedCount: progressUpdates.filter(p => p.status === 'skipped').length
          }
        }
      });
    } catch (error) {
      console.error('Error downloading all images:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download all images',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verifica si una imagen específica existe localmente
   */
  async checkImageExists(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;
      const { imageType = 'small' } = req.query;

      if (!cardId) {
        res.status(400).json({
          success: false,
          error: 'Card ID is required'
        });
        return;
      }

      if (imageType !== 'small' && imageType !== 'large') {
        res.status(400).json({
          success: false,
          error: 'Image type must be "small" or "large"'
        });
        return;
      }

      const exists = await imageDownloadService.imageExists(cardId, imageType as 'small' | 'large');
      const imagePath = imageDownloadService.getImagePath(cardId, imageType as 'small' | 'large');
      const imageUrl = imageDownloadService.getImageUrl(cardId, imageType as 'small' | 'large', req.protocol + '://' + req.get('host'));

      res.json({
        success: true,
        data: {
          cardId,
          imageType,
          exists,
          localPath: exists ? imagePath : null,
          publicUrl: exists ? imageUrl : null
        }
      });
    } catch (error) {
      console.error('Error checking image existence:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check image existence',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Obtiene información de imágenes para una carta específica
   */
  async getCardImageInfo(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;

      if (!cardId) {
        res.status(400).json({
          success: false,
          error: 'Card ID is required'
        });
        return;
      }

      const smallExists = await imageDownloadService.imageExists(cardId, 'small');
      const largeExists = await imageDownloadService.imageExists(cardId, 'large');
      
      const baseUrl = req.protocol + '://' + req.get('host');

      res.json({
        success: true,
        data: {
          cardId,
          images: {
            small: {
              exists: smallExists,
              localPath: smallExists ? imageDownloadService.getImagePath(cardId, 'small') : null,
              publicUrl: smallExists ? imageDownloadService.getImageUrl(cardId, 'small', baseUrl) : null
            },
            large: {
              exists: largeExists,
              localPath: largeExists ? imageDownloadService.getImagePath(cardId, 'large') : null,
              publicUrl: largeExists ? imageDownloadService.getImageUrl(cardId, 'large', baseUrl) : null
            }
          }
        }
      });
    } catch (error) {
      console.error('Error getting card image info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get card image info',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Utilidades privadas
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async countFilesInDirectory(dirPath: string): Promise<number> {
    try {
      const files = await fs.readdir(dirPath);
      return files.filter(file => file.endsWith('.png')).length;
    } catch {
      return 0;
    }
  }
}

export const imageController = new ImageController();