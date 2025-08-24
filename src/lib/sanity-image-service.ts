import sanityClient, { sanityHelpers, PokemonCardImage, sanityReadClient } from './sanity-client';
import { localPokemonData } from './local-pokemon-data';
import fs from 'fs';
import path from 'path';

export class SanityImageService {
  constructor() {
    // Usar la instancia exportada de localPokemonData
  }

  /**
   * Migra una imagen específica a Sanity
   */
  async migrateCardImage(cardId: string, imageUrl: string, imageType: 'small' | 'large'): Promise<string | null> {
    try {
      // Verificar si la imagen ya existe en Sanity
      const exists = await sanityHelpers.imageExists(cardId, imageType);
      if (exists) {
        // Image already exists in Sanity
        return null;
      }

      // Obtener información de la carta
      const card = await localPokemonData.getCardById(cardId);
      if (!card) {
        // Card not found in local data
        return null;
      }

      if (!card.set) {
        // Card has no set information
        return null;
      }

      // Generar nombre de archivo
      const filename = `${cardId}_${imageType}.png`;
      
      // Uploading image to Sanity
      
      // Subir imagen a Sanity
      const asset = await sanityHelpers.uploadImageFromUrl(imageUrl, filename);
      
      // Crear documento de imagen en Sanity
      const imageDocument: Omit<PokemonCardImage, '_id'> = {
        _type: 'pokemonCardImage',
        cardId: cardId,
        setId: card.set.id,
        name: card.name,
        imageAsset: {
          _type: 'image',
          asset: {
            _ref: asset._id,
            _type: 'reference'
          }
        },
        imageType: imageType,
        originalUrl: imageUrl,
        uploadedAt: new Date().toISOString()
      };

      const result = await sanityHelpers.createCardImageDocument(imageDocument);
      // Successfully uploaded image to Sanity
      
      return result._id;
    } catch (error) {
      // Error migrating image
      return null;
    }
  }

  /**
   * Migra todas las imágenes de un set específico
   */
  async migrateSetImages(setId: string, batchSize: number = 10): Promise<void> {
    try {
      // Starting migration for set
      
      const cards = await localPokemonData.getCardsBySet(setId);
      // Found cards in set

      let processed = 0;
      let successful = 0;
      let failed = 0;

      // Procesar en lotes para evitar sobrecargar la API
      for (let i = 0; i < cards.length; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        const promises = [];

        for (const card of batch) {
          if (card.images?.small) {
            promises.push(
              this.migrateCardImage(card.id, card.images.small, 'small')
                .then(result => ({ success: !!result, type: 'small', cardId: card.id }))
                .catch(error => ({ success: false, type: 'small', cardId: card.id, error }))
            );
          }
          
          if (card.images?.large) {
            promises.push(
              this.migrateCardImage(card.id, card.images.large, 'large')
                .then(result => ({ success: !!result, type: 'large', cardId: card.id }))
                .catch(error => ({ success: false, type: 'large', cardId: card.id, error }))
            );
          }
        }

        // Esperar a que termine el lote actual
        const results = await Promise.all(promises);
        
        // Contar resultados
        results.forEach(result => {
          processed++;
          if (result.success) {
            successful++;
          } else {
            failed++;
            // Failed to migrate card image
          }
        });

        // Processed batch progress
        
        // Pausa entre lotes para no sobrecargar la API
        if (i + batchSize < cards.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Migration completed for set
      // Total images processed
      // Successful uploads
      // Failed uploads
    } catch (error) {
      // Error migrating set
      throw error;
    }
  }

  /**
   * Migra todas las imágenes de todos los sets
   */
  async migrateAllImages(batchSize: number = 5): Promise<void> {
    try {
      // Starting full migration to Sanity
      
      const sets = await localPokemonData.getSets('en');
      // Found sets to migrate

      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;

      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        // Migrating set
        
        try {
          const beforeStats = await this.getMigrationStats();
          await this.migrateSetImages(set.id, batchSize);
          const afterStats = await this.getMigrationStats();
          
          const setProcessed = afterStats.total - beforeStats.total;
          totalProcessed += setProcessed;
          totalSuccessful += setProcessed; // Asumimos que si no hay error, fue exitoso
          
          // Set completed
        } catch (error) {
          // Failed to migrate set
          totalFailed++;
        }

        // Pausa entre sets
        if (i + 1 < sets.length) {
          // Waiting before next set
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Migration summary
      // Total sets processed
      // Total images processed
      // Successful uploads
      // Failed uploads
      
      const finalStats = await this.getMigrationStats();
      // Final count in Sanity
    } catch (error) {
      // Error during full migration
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de migración
   */
  async getMigrationStats() {
    try {
      const query = `{
        "total": count(*[_type == "pokemonCardImage"]),
        "small": count(*[_type == "pokemonCardImage" && imageType == "small"]),
        "large": count(*[_type == "pokemonCardImage" && imageType == "large"])
      }`;
      
      // Usar cliente de lectura con CDN para estadísticas más rápidas
      const stats = await sanityReadClient.fetch(query);
      return stats;
    } catch (error) {
      // Error getting migration stats
      return { total: 0, small: 0, large: 0 };
    }
  }

  /**
   * Verifica la conectividad con Sanity
   */
  async testConnection(): Promise<boolean> {
    try {
      const query = `count(*[_type == "pokemonCardImage"])`;
      // Usar cliente de lectura para prueba de conexión
      await sanityReadClient.fetch(query);
      // Sanity connection successful
      return true;
    } catch (error) {
      // Sanity connection failed
      return false;
    }
  }

  /**
   * Limpia todas las imágenes de Sanity (usar con precaución)
   */
  async clearAllImages(): Promise<void> {
    try {
      // WARNING: This will delete ALL images from Sanity
      
      const query = `*[_type == "pokemonCardImage"]._id`;
      const ids = await sanityClient.fetch(query);
      
      // Found images to delete
      
      if (ids.length > 0) {
        const transaction = sanityClient.transaction();
        ids.forEach((id: string) => {
          transaction.delete(id);
        });
        
        await transaction.commit();
        // Deleted images from Sanity
      } else {
        // No images found to delete
      }
    } catch (error) {
      // Error clearing images
      throw error;
    }
  }
}

export default SanityImageService;