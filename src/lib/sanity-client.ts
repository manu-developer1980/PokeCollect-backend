import { createClient } from '@sanity/client';

// Configuración del cliente Sanity
// Cliente para operaciones de escritura (sin CDN)
const sanityWriteClient = createClient({
  projectId: 'mu8n20rt',
  dataset: 'production',
  useCdn: false, // Para operaciones de escritura
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN || 'sklZlmKmXU7r8EstCW6fihjPRYmvz9uBhAH8xYu9pxTs0U2fuYXOCfgd5ANsl5vri7LQe8Vi7Iln0Sv8eZMIn1jeEMoaKl1FO2ww2LooHw21gOreLUR1HgOhaJku24XKvk8clLs2x7JShl271oUQ9XolpEJY0rvgeYcKSFl2AfMhmOIKJKZF'
});

// Cliente para operaciones de lectura (con CDN para mejor rendimiento)
const sanityReadClient = createClient({
  projectId: 'mu8n20rt',
  dataset: 'production',
  useCdn: true, // Usar CDN para lecturas más rápidas
  apiVersion: '2024-01-01'
});

// Cliente principal (para compatibilidad)
const sanityClient = sanityWriteClient;

export default sanityClient;
export { sanityReadClient, sanityWriteClient };

// Tipos para las imágenes de cartas Pokémon
export interface PokemonCardImage {
  _id?: string;
  _type: 'pokemonCardImage';
  cardId: string;
  setId: string;
  name: string;
  imageAsset: {
    _type: 'image';
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  imageType: 'small' | 'large';
  originalUrl: string;
  uploadedAt: string;
}

// Funciones auxiliares para trabajar con imágenes
export const sanityHelpers = {
  // Subir imagen desde URL
  async uploadImageFromUrl(url: string, filename: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      const asset = await sanityClient.assets.upload('image', Buffer.from(buffer), {
        filename: filename
      });
      
      return asset;
    } catch (error) {
      console.error('Error uploading image to Sanity:', error);
      throw error;
    }
  },

  // Crear documento de imagen de carta
  async createCardImageDocument(cardData: Omit<PokemonCardImage, '_id'>) {
    try {
      const result = await sanityClient.create(cardData);
      return result;
    } catch (error) {
      console.error('Error creating card image document:', error);
      throw error;
    }
  },

  // Obtener imagen por cardId
  async getCardImage(cardId: string, imageType?: 'small' | 'large') {
    try {
      let query = `*[_type == "pokemonCardImage" && cardId == $cardId`;
      if (imageType) {
        query += ` && imageType == $imageType`;
      }
      query += `] {
        _id,
        cardId,
        setId,
        name,
        imageType,
        originalUrl,
        uploadedAt,
        "imageUrl": imageAsset.asset->url
      }`;
      
      const params = imageType ? { cardId, imageType } : { cardId };
      // Usar cliente de lectura con CDN para mejor rendimiento
      const result = await sanityReadClient.fetch(query, params);
      return result;
    } catch (error) {
      console.error('Error fetching card image:', error);
      throw error;
    }
  },

  // Verificar si una imagen ya existe
  async imageExists(cardId: string, imageType: 'small' | 'large') {
    try {
      const query = `count(*[_type == "pokemonCardImage" && cardId == $cardId && imageType == $imageType])`;
      // Usar cliente de lectura con CDN para verificaciones más rápidas
      const count = await sanityReadClient.fetch(query, { cardId, imageType });
      return count > 0;
    } catch (error) {
      console.error('Error checking if image exists:', error);
      return false;
    }
  }
};