import { Request, Response } from 'express';
import { sanityHelpers } from '../lib/sanity-client';
import SanityImageService from '../lib/sanity-image-service';
import { localPokemonData } from '../lib/local-pokemon-data';

// Tipo para las imágenes que retorna Sanity
interface SanityImageResult {
  _id: string;
  cardId: string;
  setId: string;
  name: string;
  imageType: 'small' | 'large';
  originalUrl: string;
  uploadedAt: string;
  imageUrl: string;
}

const sanityImageService = new SanityImageService();

// Obtener imagen de una carta específica
export const getCardImage = async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;
      const { type } = req.query;

      if (!cardId) {
        return res.status(400).json({
          error: 'Card ID is required'
        });
      }

      // Validar tipo de imagen si se especifica
      if (type && type !== 'small' && type !== 'large') {
        return res.status(400).json({
          error: 'Image type must be "small" or "large"'
        });
      }

      const imageType = type as 'small' | 'large' | undefined;
      const images = await sanityHelpers.getCardImage(cardId, imageType);

      if (!images || images.length === 0) {
        return res.status(404).json({
          error: 'Image not found',
          cardId,
          available: false
        });
      }

      // Si se especificó un tipo, devolver solo esa imagen
      if (imageType) {
        const image = images.find((img: SanityImageResult) => img.imageType === imageType);
        if (!image) {
          return res.status(404).json({
            error: `${imageType} image not found for card ${cardId}`,
            cardId,
            available: false
          });
        }

        return res.json({
          cardId,
          name: image.name,
          setId: image.setId,
          imageType: image.imageType,
          imageUrl: image.imageUrl,
          originalUrl: image.originalUrl,
          uploadedAt: image.uploadedAt,
          available: true
        });
      }

      // Devolver todas las imágenes disponibles
      const response = {
        cardId,
        name: images[0].name,
        setId: images[0].setId,
        images: {} as any,
        available: true
      };

      images.forEach((image: SanityImageResult) => {
        response.images[image.imageType] = {
          imageUrl: image.imageUrl,
          originalUrl: image.originalUrl,
          uploadedAt: image.uploadedAt
        };
      });

      return res.json(response);
    } catch (error) {
      console.error('Error getting card image:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

// Verificar si existe imagen para una carta
export const checkImageExists = async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;
      const { type } = req.query;

      if (!cardId) {
        return res.status(400).json({
          error: 'Card ID is required'
        });
      }

      const imageType = type as 'small' | 'large' | undefined;
      
      if (imageType) {
        const exists = await sanityHelpers.imageExists(cardId, imageType);
        return res.json({
          cardId,
          imageType,
          exists
        });
      }

      // Verificar ambos tipos
      const [smallExists, largeExists] = await Promise.all([
        sanityHelpers.imageExists(cardId, 'small'),
        sanityHelpers.imageExists(cardId, 'large')
      ]);

      return res.json({
        cardId,
        exists: {
          small: smallExists,
          large: largeExists,
          any: smallExists || largeExists
        }
      });
    } catch (error) {
      console.error('Error checking image existence:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

// Migrar imagen de una carta específica
export const migrateCardImage = async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;
      const { imageUrl, imageType } = req.body;

      if (!cardId || !imageUrl || !imageType) {
        return res.status(400).json({
          error: 'Card ID, image URL, and image type are required'
        });
      }

      if (imageType !== 'small' && imageType !== 'large') {
        return res.status(400).json({
          error: 'Image type must be "small" or "large"'
        });
      }

      const result = await sanityImageService.migrateCardImage(cardId, imageUrl, imageType);
      
      if (!result) {
        return res.status(400).json({
          error: 'Failed to migrate image',
          cardId,
          imageType
        });
      }

      return res.json({
        success: true,
        cardId,
        imageType,
        sanityId: result,
        message: 'Image migrated successfully'
      });
    } catch (error) {
      console.error('Error migrating card image:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

// Migrar todas las imágenes de un set
export const migrateSetImages = async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      const { batchSize = 10 } = req.body;

      if (!setId) {
        return res.status(400).json({
          error: 'Set ID is required'
        });
      }

      // Verificar que el set existe
      const set = await localPokemonData.getSetById(setId);
      if (!set) {
        return res.status(404).json({
          error: 'Set not found',
          setId
        });
      }

      // Iniciar migración en background
      sanityImageService.migrateSetImages(setId, batchSize)
        .then(() => {
          // Migration completed for set
        })
        .catch((error) => {
          // Migration failed for set
        });

      return res.json({
        success: true,
        message: `Migration started for set ${setId}`,
        setId,
        setName: set.name,
        batchSize
      });
    } catch (error) {
      console.error('Error starting set migration:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

// Obtener estadísticas de migración
export const getMigrationStats = async (req: Request, res: Response) => {
    try {
      const stats = await sanityImageService.getMigrationStats();
      
      return res.json({
        sanity: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting migration stats:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

// Probar conexión con Sanity
export const testSanityConnection = async (req: Request, res: Response) => {
    try {
      const isConnected = await sanityImageService.testConnection();
      
      return res.json({
        connected: isConnected,
        service: 'Sanity CMS',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error testing Sanity connection:', error);
      return res.status(500).json({
        error: 'Internal server error',
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

// Migrar todas las imágenes (proceso completo)
export const migrateAllImages = async (req: Request, res: Response) => {
    try {
      const { batchSize = 5, confirm } = req.body;

      if (confirm !== 'YES_MIGRATE_ALL') {
        return res.status(400).json({
          error: 'Confirmation required',
          message: 'Set confirm: "YES_MIGRATE_ALL" to proceed with full migration'
        });
      }

      // Iniciar migración completa en background
      sanityImageService.migrateAllImages(batchSize)
        .then(() => {
          // Full migration completed successfully
        })
        .catch((error) => {
          // Full migration failed
        });

      return res.json({
        success: true,
        message: 'Full migration started',
        warning: 'This process may take several hours',
        batchSize
      });
    } catch (error) {
      console.error('Error starting full migration:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };