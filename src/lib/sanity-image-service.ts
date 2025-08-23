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
        console.log(`Image ${cardId} (${imageType}) already exists in Sanity`);
        return null;
      }

      // Obtener información de la carta
      const card = await localPokemonData.getCardById(cardId);
      if (!card) {
        console.error(`Card ${cardId} not found in local data`);
        return null;
      }

      if (!card.set) {
        console.error(`Card ${cardId} has no set information`);
        return null;
      }

      // Generar nombre de archivo
      const filename = `${cardId}_${imageType}.png`;
      
      console.log(`Uploading ${filename} to Sanity...`);
      
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
      console.log(`Successfully uploaded ${filename} to Sanity with ID: ${result._id}`);
      
      return result._id;
    } catch (error) {
      console.error(`Error migrating image ${cardId} (${imageType}):`, error);
      return null;
    }
  }

  /**
   * Migra todas las imágenes de un set específico
   */
  async migrateSetImages(setId: string, batchSize: number = 10): Promise<void> {
    try {
      console.log(`Starting migration for set: ${setId}`);
      
      const cards = await localPokemonData.getCardsBySet(setId);
      console.log(`Found ${cards.length} cards in set ${setId}`);

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
            console.error(`Failed to migrate ${result.cardId} (${result.type}):`, 'error' in result ? result.error : 'Unknown error');
          }
        });

        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cards.length / batchSize)}. Progress: ${processed} images (${successful} successful, ${failed} failed)`);
        
        // Pausa entre lotes para no sobrecargar la API
        if (i + batchSize < cards.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Migration completed for set ${setId}:`);
      console.log(`- Total images processed: ${processed}`);
      console.log(`- Successful uploads: ${successful}`);
      console.log(`- Failed uploads: ${failed}`);
    } catch (error) {
      console.error(`Error migrating set ${setId}:`, error);
      throw error;
    }
  }

  /**
   * Migra todas las imágenes de todos los sets
   */
  async migrateAllImages(batchSize: number = 5): Promise<void> {
    try {
      console.log('Starting full migration to Sanity...');
      
      const sets = await localPokemonData.getSets('en');
      console.log(`Found ${sets.length} sets to migrate`);

      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;

      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        console.log(`\n[${i + 1}/${sets.length}] Migrating set: ${set.id} (${set.name})`);
        
        try {
          const beforeStats = await this.getMigrationStats();
          await this.migrateSetImages(set.id, batchSize);
          const afterStats = await this.getMigrationStats();
          
          const setProcessed = afterStats.total - beforeStats.total;
          totalProcessed += setProcessed;
          totalSuccessful += setProcessed; // Asumimos que si no hay error, fue exitoso
          
          console.log(`Set ${set.id} completed. Images in Sanity: ${afterStats.total}`);
        } catch (error) {
          console.error(`Failed to migrate set ${set.id}:`, error);
          totalFailed++;
        }

        // Pausa entre sets
        if (i + 1 < sets.length) {
          console.log('Waiting 2 seconds before next set...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log('\n=== MIGRATION SUMMARY ===');
      console.log(`Total sets processed: ${sets.length}`);
      console.log(`Total images processed: ${totalProcessed}`);
      console.log(`Successful uploads: ${totalSuccessful}`);
      console.log(`Failed uploads: ${totalFailed}`);
      
      const finalStats = await this.getMigrationStats();
      console.log(`Final count in Sanity: ${finalStats.total} images`);
    } catch (error) {
      console.error('Error during full migration:', error);
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
      console.error('Error getting migration stats:', error);
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
      console.log('✅ Sanity connection successful');
      return true;
    } catch (error) {
      console.error('❌ Sanity connection failed:', error);
      return false;
    }
  }

  /**
   * Limpia todas las imágenes de Sanity (usar con precaución)
   */
  async clearAllImages(): Promise<void> {
    try {
      console.log('⚠️  WARNING: This will delete ALL images from Sanity!');
      
      const query = `*[_type == "pokemonCardImage"]._id`;
      const ids = await sanityClient.fetch(query);
      
      console.log(`Found ${ids.length} images to delete`);
      
      if (ids.length > 0) {
        const transaction = sanityClient.transaction();
        ids.forEach((id: string) => {
          transaction.delete(id);
        });
        
        await transaction.commit();
        console.log(`✅ Deleted ${ids.length} images from Sanity`);
      } else {
        console.log('No images found to delete');
      }
    } catch (error) {
      console.error('Error clearing images:', error);
      throw error;
    }
  }
}

export default SanityImageService;