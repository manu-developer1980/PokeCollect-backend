import NodeCache from 'node-cache';

// Configuración del caché
const DEFAULT_TTL = 300; // 5 minutos
const LONG_TTL = 3600; // 1 hora
const SHORT_TTL = 60; // 1 minuto

// Instancia del caché
const cache = new NodeCache({
  stdTTL: DEFAULT_TTL,
  checkperiod: 120, // Verificar elementos expirados cada 2 minutos
  useClones: false // Para mejor rendimiento
});

// Tipos para TypeScript
interface CacheOptions {
  ttl?: number;
  key?: string;
}

interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
}

/**
 * Servicio de caché centralizado para el backend
 */
export class CacheService {
  private static instance: CacheService;
  private hitCount = 0;
  private missCount = 0;

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Obtiene un valor del caché
   */
  get<T>(key: string): T | undefined {
    const value = cache.get<T>(key);
    if (value !== undefined) {
      this.hitCount++;
      console.log(`🎯 Cache HIT para clave: ${key}`);
    } else {
      this.missCount++;
      console.log(`❌ Cache MISS para clave: ${key}`);
    }
    return value;
  }

  /**
   * Establece un valor en el caché
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const success = cache.set(key, value, ttl || DEFAULT_TTL);
    if (success) {
      console.log(`💾 Valor guardado en caché: ${key} (TTL: ${ttl || DEFAULT_TTL}s)`);
    }
    return success;
  }

  /**
   * Elimina una clave del caché
   */
  del(key: string): number {
    const deleted = cache.del(key);
    if (deleted > 0) {
      console.log(`🗑️ Eliminado del caché: ${key}`);
    }
    return deleted;
  }

  /**
   * Verifica si una clave existe en el caché
   */
  has(key: string): boolean {
    return cache.has(key);
  }

  /**
   * Limpia todo el caché
   */
  flush(): void {
    cache.flushAll();
    this.hitCount = 0;
    this.missCount = 0;
    console.log('🧹 Caché completamente limpiado');
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): CacheStats & { hitRate: number; missRate: number } {
    const stats = cache.getStats();
    const total = this.hitCount + this.missCount;
    return {
      ...stats,
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      missRate: total > 0 ? (this.missCount / total) * 100 : 0
    };
  }

  /**
   * Obtiene todas las claves del caché
   */
  keys(): string[] {
    return cache.keys();
  }

  /**
   * Función helper para cachear resultados de funciones asíncronas
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const result = await fetchFunction();
      this.set(key, result, options.ttl);
      return result;
    } catch (error) {
      console.error(`❌ Error al obtener datos para caché ${key}:`, error);
      throw error;
    }
  }

  /**
   * Genera una clave de caché basada en parámetros
   */
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * TTL predefinidos para diferentes tipos de datos
   */
  static TTL = {
    SHORT: SHORT_TTL,
    DEFAULT: DEFAULT_TTL,
    LONG: LONG_TTL,
    POKEMON_CARDS: 600, // 10 minutos para cartas
    POKEMON_SETS: 1800, // 30 minutos para sets
    POKEMON_TYPES: 3600, // 1 hora para tipos (raramente cambian)
    POKEMON_RARITIES: 3600, // 1 hora para raridades
  };
}

// Exportar instancia singleton
export const cacheService = CacheService.getInstance();

// Middleware para limpiar caché en desarrollo
if (process.env.NODE_ENV === 'development') {
  // Limpiar caché cada 30 minutos en desarrollo
  setInterval(() => {
    console.log('🔄 Limpieza automática de caché en desarrollo');
    cacheService.flush();
  }, 30 * 60 * 1000);
}