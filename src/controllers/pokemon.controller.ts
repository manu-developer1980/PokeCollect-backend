import { Request, Response } from "express";
import { localPokemonData } from "../lib/local-pokemon-data";
import { cacheService } from "../lib/cache-service";

export class PokemonController {
  // Buscar cartas
  static async searchCards(req: Request, res: Response) {
    try {
      const {
        name,
        type,
        supertype,
        subtype,
        rarity,
        set,
        pageSize = "20",
        page = "1",
      } = req.query;

      const limit = Math.min(parseInt(pageSize as string) || 20, 250);
      const pageNum = parseInt(page as string) || 1;
      const offset = (pageNum - 1) * limit;

      let cards = [];

      // Buscar por diferentes criterios
      if (name) {
        cards = await localPokemonData.searchCardsByName(
          name as string,
          limit * 2
        );
      } else if (type) {
        cards = await localPokemonData.searchCardsByType(
          type as string,
          limit * 2
        );
      } else if (supertype) {
        cards = await localPokemonData.searchCardsBySupertype(
          supertype as string,
          limit * 2
        );
      } else {
        // Si no hay filtros específicos, obtener todas las cartas
        const allCards = await localPokemonData.getAllCards();
        cards = allCards.slice(0, limit * 2);
      }

      // Filtros adicionales
      if (subtype) {
        cards = cards.filter((card) =>
          card.subtypes?.some((st) =>
            st.toLowerCase().includes((subtype as string).toLowerCase())
          )
        );
      }

      if (rarity) {
        cards = cards.filter((card) =>
          card.rarity?.toLowerCase().includes((rarity as string).toLowerCase())
        );
      }

      if (set) {
        cards = cards.filter(
          (card) =>
            card.set?.id === set ||
            card.set?.name.toLowerCase().includes((set as string).toLowerCase())
        );
      }

      // Paginación
      const paginatedCards = cards.slice(offset, offset + limit);
      const totalCount = cards.length;

      res.json({
        success: true,
        data: paginatedCards,
        page: pageNum,
        pageSize: limit,
        count: paginatedCards.length,
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

      // Guardar en cache por 1 hora
      cacheService.set(cacheKey, card, 3600);

      res.json({
        success: true,
        data: card,
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
      const { pageSize = "20", page = "1", name } = req.query;
      const limit = Math.min(parseInt(pageSize as string) || 20, 250);
      const pageNum = parseInt(page as string) || 1;
      const offset = (pageNum - 1) * limit;

      const cacheKey = `local-sets-${pageNum}-${limit}-${name || "all"}`;

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
      } else {
        sets = await localPokemonData.getSets();
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

      const result = {
        data: paginatedCards,
        count: paginatedCards.length,
        totalCount,
      };

      // Guardar en cache por 1 hora
      cacheService.set(cacheKey, result, 3600);

      res.json({
        success: true,
        data: paginatedCards,
        page: pageNum,
        pageSize: limit,
        count: paginatedCards.length,
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
