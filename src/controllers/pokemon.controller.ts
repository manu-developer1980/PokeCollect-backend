import { Request, Response } from "express";
import axios from "axios";
import { cacheService, CacheService } from "../lib/cache-service";
import { externalAPILimiter } from "../lib/rate-limiter";
import { 
  searchCardsMock, 
  getCardByIdMock, 
  getSetsMock, 
  getTypesMock, 
  getRaritiesMock,
  checkAPIHealth 
} from "./pokemon-mock.controller";

const POKEMON_TCG_API_BASE = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.POKEMON_TCG_API_KEY || "";

// Configuración de headers para la API de Pokémon TCG
const apiHeaders = API_KEY ? { "X-Api-Key": API_KEY } : {};

// Log de configuración inicial
console.log('🔧 Configuración API:', {
  hasApiKey: !!API_KEY,
  apiKeyLength: API_KEY.length,
  baseUrl: POKEMON_TCG_API_BASE
});

// Función de utilidad para reintentar peticiones con rate limiting
async function fetchWithRetry(url: string, retries = 3, delay = 1000) {
  return externalAPILimiter.execute(async () => {
    console.log('🌐 Petición a API externa:', { url, headers: apiHeaders });
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, { headers: apiHeaders });
        console.log('✅ Respuesta exitosa de API externa:', {
          status: response.status,
          dataCount: response.data?.data?.length || 0,
          totalCount: response.data?.totalCount || 0
        });
        return response.data;
      } catch (error) {
        console.error(`❌ Error en intento ${i + 1}/${retries}:`, {
          message: error instanceof Error ? error.message : 'Error desconocido',
          status: (error as any)?.response?.status,
          statusText: (error as any)?.response?.statusText,
          url
        });
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i))); // Backoff exponencial
      }
    }
  });
}

// Controlador para buscar cartas
export const searchCards = async (req: Request, res: Response) => {
  const { q, page, pageSize, orderBy, set, rarity } = req.query;

  // Verificar si la API externa está disponible
  const isAPIHealthy = await checkAPIHealth();
  if (!isAPIHealthy) {
    console.log('🔄 API externa no disponible, usando datos mock');
    return searchCardsMock(req, res);
  }

  try {
    // Generar clave de caché basada en los parámetros de búsqueda
    const cacheKey = cacheService.generateKey('pokemon:cards', {
      q: q || '',
      page: page || 1,
      pageSize: pageSize || 20,
      orderBy: orderBy || '',
      set: set || '',
      rarity: rarity || ''
    });

    // Intentar obtener del caché primero
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log('🎯 Devolviendo resultados de búsqueda desde caché');
      return res.json(cachedResult);
    }

    // Construir los parámetros de la URL
    const params = new URLSearchParams();

    // Construir la consulta usando sintaxis Lucene correcta
    const queryParts: string[] = [];
    
    // Añadir el parámetro de búsqueda principal (solo si hay texto de búsqueda)
    if (q && q.toString().trim()) {
      // Usar búsqueda más flexible: buscar en nombre o permitir comodines
      const searchTerm = q.toString().trim();
      queryParts.push(`name:*${searchTerm}*`);
    }

    // Añadir filtro por set si está presente
    if (set && set !== "all") {
      queryParts.push(`set.id:"${set}"`);
    }

    // Añadir filtro por rareza si está presente
    if (rarity && rarity !== "all") {
      queryParts.push(`rarity:"${rarity}"`);
    }

    // Combinar todas las partes de la consulta con AND
    if (queryParts.length > 0) {
      const finalQuery = queryParts.join(' AND ');
      params.append('q', finalQuery);
    }

    // Añadir paginación y ordenación
    if (page) params.append('page', page as string);
    if (pageSize) params.append('pageSize', pageSize as string);
    if (orderBy) params.append('orderBy', orderBy as string);

    const queryString = params.toString();
    const finalUrl = `${POKEMON_TCG_API_BASE}/cards?${queryString}`;
    
    console.log('🔍 Búsqueda de cartas:', {
      originalParams: { q, page, pageSize, orderBy, set, rarity },
      finalUrl,
      queryString
    });

    const response = await fetchWithRetry(finalUrl);

    // Guardar en caché
    cacheService.set(cacheKey, response, CacheService.TTL.POKEMON_CARDS);
    console.log('💾 Resultados de búsqueda guardados en caché');

    res.json(response);
  } catch (error) {
    console.error("API request failed:", error);
    res.status(500).json({
      data: [],
      page: 1,
      pageSize: 20,
      count: 0,
      totalCount: 0,
      error: "Failed to fetch cards",
    });
  }
};

// Controlador para obtener una carta por ID
export const getCardById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Verificar si la API externa está disponible
  const isAPIHealthy = await checkAPIHealth();
  if (!isAPIHealthy) {
    console.log('🔄 API externa no disponible, usando datos mock para carta por ID');
    return getCardByIdMock(req, res);
  }

  try {
    const cacheKey = `pokemon:card:${id}`;
    
    // Intentar obtener del caché primero
    const cachedCard = cacheService.get(cacheKey);
    if (cachedCard) {
      console.log(`🎯 Carta ${id} devuelta desde caché`);
      return res.json(cachedCard);
    }

    const data = await fetchWithRetry(`${POKEMON_TCG_API_BASE}/cards/${id}`);
    
    // Guardar en caché con TTL largo (las cartas no cambian)
    cacheService.set(cacheKey, data, CacheService.TTL.LONG);
    console.log(`💾 Carta ${id} guardada en caché`);
    
    res.json(data);
  } catch (error) {
    console.error(`Failed to fetch card details for ${id}:`, error);
    res.status(404).json({
      data: {
        id,
        name: "Card Unavailable",
        images: {
          small: "/placeholder-card.png",
          large: "/placeholder-card.png",
        },
      },
    });
  }
};

// Controlador para obtener todos los sets
export const getSets = async (req: Request, res: Response) => {
  // Verificar si la API externa está disponible
  const isAPIHealthy = await checkAPIHealth();
  if (!isAPIHealthy) {
    console.log('🔄 API externa no disponible, usando datos mock para sets');
    return getSetsMock(req, res);
  }

  try {
    const cacheKey = 'pokemon:sets:all';
    
    // Intentar obtener del caché primero
    const cachedSets = cacheService.get(cacheKey);
    if (cachedSets) {
      console.log('🎯 Sets devueltos desde caché');
      return res.json(cachedSets);
    }

    const response = await fetchWithRetry(
      `${POKEMON_TCG_API_BASE}/sets?orderBy=-releaseDate`
    );

    // Transformar y enriquecer la respuesta
    const sets = response.data.map((set: any) => ({
      id: set.id,
      name: set.name,
      series: set.series,
      printedTotal: set.printedTotal,
      releaseDate: set.releaseDate,
      images: set.images,
      symbol: set.images?.symbol || null,
      logo: set.images?.logo || null,
    }));

    const result = {
      data: sets,
      count: sets.length,
    };

    // Guardar en caché con TTL largo (los sets cambian poco)
    cacheService.set(cacheKey, result, CacheService.TTL.POKEMON_SETS);
    console.log('💾 Sets guardados en caché');

    res.json(result);
  } catch (error) {
    console.error("Error fetching sets:", error);
    res.status(500).json({
      error: "Failed to fetch sets",
      data: [],
    });
  }
};

// Controlador para obtener todos los tipos
export const getTypes = async (req: Request, res: Response) => {
  // Verificar si la API externa está disponible
  const isAPIHealthy = await checkAPIHealth();
  if (!isAPIHealthy) {
    console.log('🔄 API externa no disponible, usando datos mock para tipos');
    return getTypesMock(req, res);
  }

  try {
    const cacheKey = 'pokemon:types:all';
    
    // Intentar obtener del caché primero
    const cachedTypes = cacheService.get(cacheKey);
    if (cachedTypes) {
      console.log('🎯 Tipos devueltos desde caché');
      return res.json(cachedTypes);
    }

    const response = await fetchWithRetry(`${POKEMON_TCG_API_BASE}/types`);
    
    // Guardar en caché con TTL muy largo (los tipos raramente cambian)
    cacheService.set(cacheKey, response, CacheService.TTL.POKEMON_TYPES);
    console.log('💾 Tipos guardados en caché');
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching types:", error);
    res.status(500).json({ error: "Failed to fetch types", data: [] });
  }
};

// Controlador para obtener raridades
// Controlador para obtener todas las rarezas
export const getRarities = async (req: Request, res: Response) => {
  // Verificar si la API externa está disponible
  const isAPIHealthy = await checkAPIHealth();
  if (!isAPIHealthy) {
    console.log('🔄 API externa no disponible, usando datos mock para rarezas');
    return getRaritiesMock(req, res);
  }

  try {
    const cacheKey = 'pokemon:rarities:all';
    
    // Intentar obtener del caché primero
    const cachedRarities = cacheService.get(cacheKey);
    if (cachedRarities) {
      console.log('🎯 Raridades devueltas desde caché');
      return res.json(cachedRarities);
    }

    const response = await fetchWithRetry(`${POKEMON_TCG_API_BASE}/rarities`);
    
    // Guardar en caché con TTL muy largo (las raridades raramente cambian)
    cacheService.set(cacheKey, response, CacheService.TTL.POKEMON_RARITIES);
    console.log('💾 Raridades guardadas en caché');

    res.json(response);
  } catch (error) {
    console.error("Error fetching rarities:", error);
    res.status(500).json({ error: "Failed to fetch rarities", data: [] });
  }
};

// Controlador para obtener estadísticas del caché
export const getCacheStats = async (_req: Request, res: Response) => {
  try {
    const stats = cacheService.getStats();
    res.json({
      cache: stats,
      message: 'Estadísticas del caché obtenidas exitosamente'
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    res.status(500).json({ error: "Failed to get cache stats" });
  }
};

// Controlador para limpiar el caché
export const clearCache = async (_req: Request, res: Response) => {
  try {
    cacheService.flush();
    res.json({
      success: true,
      message: 'Caché limpiado exitosamente'
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
};
