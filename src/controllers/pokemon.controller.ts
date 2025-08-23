import { Request, Response } from "express";
import { localPokemonData } from "../lib/local-pokemon-data";
import { cacheService } from "../lib/cache-service";
import { sanityHelpers } from "../lib/sanity-client";

export class PokemonController {
  // Función auxiliar para reemplazar URLs de imágenes con Sanity
  private static async replaceImageUrls(card: any): Promise<any> {
    try {
      const sanityImages = await sanityHelpers.getCardImage(card.id);
      if (sanityImages && sanityImages.length > 0) {
        const updatedCard = { ...card };
        const smallImage = sanityImages.find((img: any) => img.imageType === 'small');
        const largeImage = sanityImages.find((img: any) => img.imageType === 'large');
        
        if (smallImage || largeImage) {
          updatedCard.images = {
            small: smallImage ? smallImage.imageUrl : card.images?.small,
            large: largeImage ? largeImage.imageUrl : card.images?.large
          };
        }
        return updatedCard;
      }
    } catch (error) {
      // Si hay error con Sanity, usar imágenes originales
      console.warn(`Failed to get Sanity images for card ${card.id}:`, error);
    }
    return card;
  }

  // Función auxiliar para procesar múltiples cartas
  private static async replaceImageUrlsForCards(cards: any[]): Promise<any[]> {
    const promises = cards.map(card => PokemonController.replaceImageUrls(card));
    return Promise.all(promises);
  }
  // Buscar cartas
  static async searchCards(req: Request, res: Response) {
    try {
      const {
        q,
        name,
        type,
        supertype,
        subtype,
        rarity,
        set,
        pageSize = "20",
        page = "1",
        orderBy,
      } = req.query;

      // Parse query parameter 'q' if provided
      let parsedName = name;
      let parsedType = type;
      let parsedSupertype = supertype;
      let parsedSubtype = subtype;
      let parsedRarity = rarity;
      let parsedSet = set;

      if (q && typeof q === 'string') {
        // Parse query string like "name:\"pika*\"" or "type:fire"
        const queryParts = q.split(' ');
        for (const part of queryParts) {
          if (part.includes(':')) {
            const [field, value] = part.split(':');
            const cleanValue = value.replace(/[\\"\'\*]/g, ''); // Remove quotes and wildcards
            
            switch (field.toLowerCase()) {
              case 'name':
                parsedName = cleanValue;
                break;
              case 'type':
                parsedType = cleanValue;
                break;
              case 'supertype':
                parsedSupertype = cleanValue;
                break;
              case 'subtype':
                parsedSubtype = cleanValue;
                break;
              case 'rarity':
                parsedRarity = cleanValue;
                break;
              case 'set':
              case 'set.id':
                parsedSet = cleanValue;
                break;
            }
          }
        }
      }

      const limit = Math.min(parseInt(pageSize as string) || 20, 250);
      const pageNum = parseInt(page as string) || 1;
      const offset = (pageNum - 1) * limit;

      let cards = [];

      // Buscar por diferentes criterios - obtener más cartas para compensar filtros
      const searchLimit = Math.max(limit * 10, 1000); // Obtener más cartas para filtrar
      
      if (parsedName) {
        cards = await localPokemonData.searchCardsByName(
          parsedName as string,
          searchLimit
        );
      } else if (parsedType) {
        cards = await localPokemonData.searchCardsByType(
          parsedType as string,
          searchLimit
        );
      } else if (parsedSupertype) {
        cards = await localPokemonData.searchCardsBySupertype(
          parsedSupertype as string,
          searchLimit
        );
      } else if (parsedSet) {
        // Si solo se filtra por set, obtener cartas de ese set específicamente
        cards = await localPokemonData.getCardsBySet(parsedSet as string);
      } else {
        // Si no hay filtros específicos, obtener todas las cartas
        cards = await localPokemonData.getAllCards();
      }

      // Filtros adicionales
      if (parsedSubtype) {
        cards = cards.filter((card) =>
          card.subtypes?.some((st) =>
            st.toLowerCase().includes((parsedSubtype as string).toLowerCase())
          )
        );
      }

      if (parsedRarity) {
        cards = cards.filter((card) =>
          card.rarity?.toLowerCase().includes((parsedRarity as string).toLowerCase())
        );
      }

      if (parsedSet) {
        cards = cards.filter(
          (card) =>
            card.set?.id === parsedSet ||
            card.set?.name.toLowerCase().includes((parsedSet as string).toLowerCase())
        );
      }

      // Ordenamiento
      if (orderBy === 'name') {
        cards.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }

      // Paginación
      const paginatedCards = cards.slice(offset, offset + limit);
      const totalCount = cards.length;

      // Reemplazar URLs de imágenes con Sanity
      const cardsWithSanityImages = await PokemonController.replaceImageUrlsForCards(paginatedCards);

      res.json({
        success: true,
        data: cardsWithSanityImages,
        page: pageNum,
        pageSize: limit,
        count: cardsWithSanityImages.length,
        totalCount,
        source: "local",
      });
    } catch (error) {
      console.error("Error searching cards:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al buscar cartas",
      });
    }
  }

  // Obtener carta por ID
  static async getCardById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cacheKey = `local-card-${id}`;

      // Verificar cache
      const cachedCard = cacheService.get(cacheKey);
      if (cachedCard) {
        return res.json({
          success: true,
          data: cachedCard,
          source: "local-cache",
        });
      }

      const card = await localPokemonData.getCardById(id);

      if (!card) {
        return res.status(404).json({
          success: false,
          error: "Carta no encontrada",
        });
      }

      // Reemplazar URLs de imágenes con Sanity
      const cardWithSanityImages = await PokemonController.replaceImageUrls(card);

      // Guardar en cache por 1 hora
      cacheService.set(cacheKey, cardWithSanityImages, 3600);

      res.json({
        success: true,
        data: cardWithSanityImages,
        source: "local",
      });
    } catch (error) {
      console.error("Error getting card by ID:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al obtener la carta",
      });
    }
  }

  // Obtener todos los sets
  static async getSets(req: Request, res: Response) {
    try {
      const { pageSize = "20", page = "1", name, lang = "en" } = req.query;
      const limit = Math.min(parseInt(pageSize as string) || 20, 250);
      const pageNum = parseInt(page as string) || 1;
      const offset = (pageNum - 1) * limit;
      const language = lang as string;

      const cacheKey = `local-sets-${pageNum}-${limit}-${name || "all"}-${language}`;

      // Verificar cache
      const cachedSets = cacheService.get(cacheKey) as any;
      if (cachedSets) {
        return res.json({
          success: true,
          data: cachedSets.data,
          page: pageNum,
          pageSize: limit,
          count: cachedSets.count,
          totalCount: cachedSets.totalCount,
          source: "local-cache",
        });
      }

      let sets = [];

      if (name) {
        sets = await localPokemonData.searchSetsByName(name as string, 1000);
        // Apply translation to search results if needed
        if (language === 'es') {
          sets = sets.map(set => {
            const { getSpanishSetName } = require('../data/set-translations');
            const spanishName = getSpanishSetName(set.id, set.name);
            return {
              ...set,
              name: spanishName
            };
          });
        }
        
        // Sort alphabetically
        sets = sets.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        sets = await localPokemonData.getSets(language);
      }

      // Paginación
      const paginatedSets = sets.slice(offset, offset + limit);
      const totalCount = sets.length;

      const result = {
        data: paginatedSets,
        count: paginatedSets.length,
        totalCount,
      };

      // Guardar en cache por 30 minutos
      cacheService.set(cacheKey, result, 1800);

      res.json({
        success: true,
        data: paginatedSets,
        page: pageNum,
        pageSize: limit,
        count: paginatedSets.length,
        totalCount,
        source: "local",
      });
    } catch (error) {
      console.error("Error getting sets:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al obtener los sets",
      });
    }
  }

  // Obtener set por ID
  static async getSetById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cacheKey = `local-set-${id}`;

      // Verificar cache
      const cachedSet = cacheService.get(cacheKey);
      if (cachedSet) {
        return res.json({
          success: true,
          data: cachedSet,
          source: "local-cache",
        });
      }

      const set = await localPokemonData.getSetById(id);

      if (!set) {
        return res.status(404).json({
          success: false,
          error: "Set no encontrado",
        });
      }

      // Guardar en cache por 1 hora
      cacheService.set(cacheKey, set, 3600);

      res.json({
        success: true,
        data: set,
        source: "local",
      });
    } catch (error) {
      console.error("Error getting set by ID:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al obtener el set",
      });
    }
  }

  // Obtener cartas de un set
  static async getCardsBySet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { pageSize = "20", page = "1" } = req.query;
      const limit = Math.min(parseInt(pageSize as string) || 20, 250);
      const pageNum = parseInt(page as string) || 1;
      const offset = (pageNum - 1) * limit;

      const cacheKey = `local-set-cards-${id}-${pageNum}-${limit}`;

      // Verificar cache
      const cachedCards = cacheService.get(cacheKey) as any;
      if (cachedCards) {
        return res.json({
          success: true,
          data: cachedCards.data,
          page: pageNum,
          pageSize: limit,
          count: cachedCards.count,
          totalCount: cachedCards.totalCount,
          source: "local-cache",
        });
      }

      const cards = await localPokemonData.getCardsBySet(id);

      if (cards.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Set no encontrado o sin cartas",
        });
      }

      // Paginación
      const paginatedCards = cards.slice(offset, offset + limit);
      const totalCount = cards.length;

      // Reemplazar URLs de imágenes con Sanity
      const cardsWithSanityImages = await PokemonController.replaceImageUrlsForCards(paginatedCards);

      const result = {
        data: cardsWithSanityImages,
        count: cardsWithSanityImages.length,
        totalCount,
      };

      // Guardar en cache por 1 hora
      cacheService.set(cacheKey, result, 3600);

      res.json({
        success: true,
        data: cardsWithSanityImages,
        page: pageNum,
        pageSize: limit,
        count: cardsWithSanityImages.length,
        totalCount,
        source: "local",
      });
    } catch (error) {
      console.error("Error getting cards by set:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al obtener las cartas del set",
      });
    }
  }

  // Obtener metadatos (tipos, supertipos, etc.)
  static async getMetadata(req: Request, res: Response) {
    try {
      const cacheKey = "local-metadata";

      // Verificar cache
      const cachedMetadata = cacheService.get(cacheKey);
      if (cachedMetadata) {
        return res.json({
          success: true,
          data: cachedMetadata,
          source: "local-cache",
        });
      }

      const [types, supertypes, subtypes, rarities] = await Promise.all([
        localPokemonData.getTypes(),
        localPokemonData.getSupertypes(),
        localPokemonData.getSubtypes(),
        localPokemonData.getRarities(),
      ]);

      const metadata = {
        types,
        supertypes,
        subtypes,
        rarities,
      };

      // Guardar en cache por 2 horas
      cacheService.set(cacheKey, metadata, 7200);

      res.json({
        success: true,
        data: metadata,
        source: "local",
      });
    } catch (error) {
      console.error("Error getting metadata:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al obtener los metadatos",
      });
    }
  }

  // Obtener tipos
  static async getTypes(req: Request, res: Response) {
    try {
      const cacheKey = "local-types";

      // Verificar cache
      const cachedTypes = cacheService.get(cacheKey);
      if (cachedTypes) {
        return res.json({
          success: true,
          data: cachedTypes,
          source: "local-cache",
        });
      }

      const types = await localPokemonData.getTypes();

      // Guardar en cache por 2 horas
      cacheService.set(cacheKey, types, 7200);

      res.json({
        success: true,
        data: types,
        source: "local",
      });
    } catch (error) {
      console.error("Error getting types:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al obtener los tipos",
      });
    }
  }

  // Obtener rarezas
  static async getRarities(req: Request, res: Response) {
    try {
      const cacheKey = "local-rarities";

      // Verificar cache
      const cachedRarities = cacheService.get(cacheKey);
      if (cachedRarities) {
        return res.json({
          success: true,
          data: cachedRarities,
          source: "local-cache",
        });
      }

      const rarities = await localPokemonData.getRarities();

      // Guardar en cache por 2 horas
      cacheService.set(cacheKey, rarities, 7200);

      res.json({
        success: true,
        data: rarities,
        source: "local",
      });
    } catch (error) {
      console.error("Error getting rarities:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al obtener las rarezas",
      });
    }
  }

  // Obtener estadísticas
  static async getStats(req: Request, res: Response) {
    try {
      const stats = await localPokemonData.getStats();
      const cacheStats = cacheService.getStats();

      res.json({
        success: true,
        data: {
          ...stats,
          cache: cacheStats,
        },
        source: "local",
      });
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al obtener las estadísticas",
      });
    }
  }

  // Limpiar cache
  static async clearCache(req: Request, res: Response) {
    try {
      localPokemonData.clearCache();
      // cacheService.clear(); // Método no disponible

      res.json({
        success: true,
        message: "Cache limpiado exitosamente",
        source: "local",
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al limpiar el cache",
      });
    }
  }

  // Health check
  static async healthCheck(req: Request, res: Response) {
    try {
      const stats = await localPokemonData.getStats();

      res.json({
        success: true,
        status: "healthy",
        data: {
          service: "Local Pokemon Data Service",
          version: "1.0.0",
          ...stats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({
        success: false,
        status: "unhealthy",
        error: "Error en el servicio de datos locales",
      });
    }
  }
}
