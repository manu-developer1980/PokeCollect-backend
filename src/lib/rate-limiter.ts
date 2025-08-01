import { Request, Response, NextFunction } from 'express';

// Tipos para TypeScript
interface RateLimitConfig {
  windowMs: number; // Ventana de tiempo en milisegundos
  maxRequests: number; // Máximo número de peticiones por ventana
  message?: string; // Mensaje personalizado
  skipSuccessfulRequests?: boolean; // No contar peticiones exitosas
  skipFailedRequests?: boolean; // No contar peticiones fallidas
}

interface ClientInfo {
  count: number;
  resetTime: number;
  firstRequest: number;
}

/**
 * Servicio de Rate Limiting para controlar peticiones
 */
export class RateLimiter {
  private clients: Map<string, ClientInfo> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Demasiadas peticiones, intenta de nuevo más tarde.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };

    // Limpiar clientes expirados cada minuto
    setInterval(() => {
      this.cleanupExpiredClients();
    }, 60000);
  }

  /**
   * Middleware de Express para rate limiting
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = this.getClientId(req);
      const now = Date.now();
      
      let client = this.clients.get(clientId);
      
      // Si no existe el cliente o la ventana ha expirado, crear nuevo
      if (!client || now > client.resetTime) {
        client = {
          count: 0,
          resetTime: now + this.config.windowMs,
          firstRequest: now
        };
        this.clients.set(clientId, client);
      }

      // Incrementar contador
      client.count++;

      // Verificar si excede el límite
      if (client.count > this.config.maxRequests) {
        const resetTimeSeconds = Math.ceil((client.resetTime - now) / 1000);
        
        res.status(429).json({
          error: this.config.message,
          retryAfter: resetTimeSeconds,
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime: new Date(client.resetTime).toISOString()
        });
        
        console.log(`🚫 Rate limit excedido para ${clientId}: ${client.count}/${this.config.maxRequests}`);
        return;
      }

      // Añadir headers informativos
      res.set({
        'X-RateLimit-Limit': this.config.maxRequests.toString(),
        'X-RateLimit-Remaining': (this.config.maxRequests - client.count).toString(),
        'X-RateLimit-Reset': new Date(client.resetTime).toISOString()
      });

      console.log(`✅ Rate limit OK para ${clientId}: ${client.count}/${this.config.maxRequests}`);
      next();
    };
  }

  /**
   * Obtiene el identificador del cliente
   */
  private getClientId(req: Request): string {
    // Usar IP del cliente como identificador
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Limpia clientes con ventanas expiradas
   */
  private cleanupExpiredClients(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [clientId, client] of this.clients.entries()) {
      if (now > client.resetTime) {
        this.clients.delete(clientId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Limpiados ${cleaned} clientes expirados del rate limiter`);
    }
  }

  /**
   * Obtiene estadísticas del rate limiter
   */
  getStats() {
    const now = Date.now();
    const activeClients = Array.from(this.clients.values())
      .filter(client => now <= client.resetTime);
    
    return {
      totalClients: this.clients.size,
      activeClients: activeClients.length,
      config: this.config,
      averageRequestsPerClient: activeClients.length > 0 
        ? activeClients.reduce((sum, client) => sum + client.count, 0) / activeClients.length 
        : 0
    };
  }

  /**
   * Resetea el contador para un cliente específico
   */
  resetClient(clientId: string): boolean {
    return this.clients.delete(clientId);
  }

  /**
   * Resetea todos los contadores
   */
  resetAll(): void {
    this.clients.clear();
    console.log('🔄 Todos los contadores de rate limit reseteados');
  }
}

/**
 * Rate limiters predefinidos para diferentes endpoints
 */
export const rateLimiters = {
  // Rate limiter general para API
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100, // 100 peticiones por 15 minutos
    message: 'Demasiadas peticiones desde esta IP, intenta de nuevo en 15 minutos.'
  }),

  // Rate limiter estricto para búsquedas de cartas
  pokemonSearch: new RateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minuto
    maxRequests: 30, // 30 búsquedas por minuto
    message: 'Demasiadas búsquedas de cartas, intenta de nuevo en un minuto.'
  }),

  // Rate limiter para formulario de contacto
  contact: new RateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutos
    maxRequests: 3, // 3 mensajes por 10 minutos
    message: 'Demasiados mensajes de contacto, intenta de nuevo en 10 minutos.'
  }),

  // Rate limiter para endpoints de datos estáticos
  staticData: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 50, // 50 peticiones por 5 minutos
    message: 'Demasiadas peticiones a datos estáticos, intenta de nuevo en 5 minutos.'
  })
};

/**
 * Middleware helper para aplicar rate limiting específico
 */
export function createRateLimit(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);
  return limiter.middleware();
}

/**
 * Rate limiter para APIs externas (Pokemon TCG)
 */
export class ExternalAPIRateLimiter {
  private lastRequest: number = 0;
  private requestQueue: Array<() => void> = [];
  private processing: boolean = false;
  private readonly minInterval: number;

  constructor(requestsPerSecond: number = 10) {
    this.minInterval = 1000 / requestsPerSecond; // Intervalo mínimo entre peticiones
  }

  /**
   * Ejecuta una función con rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Procesa la cola de peticiones
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;

      if (timeSinceLastRequest < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequest = Date.now();
        await request();
      }
    }

    this.processing = false;
  }
}

// Instancia global para APIs externas
export const externalAPILimiter = new ExternalAPIRateLimiter(10); // 10 peticiones por segundo