import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export interface DownloadStats {
  downloaded: number;
  errors: number;
  skipped: number;
  total: number;
}

export interface DownloadProgress {
  cardId: string;
  imageType: 'small' | 'large';
  status: 'success' | 'error' | 'skipped';
  message?: string;
}

export interface ImageDownloadOptions {
  downloadSmall?: boolean;
  downloadLarge?: boolean;
  maxConcurrent?: number;
  retryCount?: number;
  timeout?: number;
  onProgress?: (progress: DownloadProgress) => void;
}

export class ImageDownloadService {
  private stats: DownloadStats = {
    downloaded: 0,
    errors: 0,
    skipped: 0,
    total: 0
  };

  private readonly baseImagePath: string;
  private downloadQueue: Array<{
    url: string;
    filepath: string;
    cardId: string;
    imageType: 'small' | 'large';
  }> = [];

  constructor(baseImagePath: string = 'public/images') {
    this.baseImagePath = baseImagePath;
  }

  /**
   * Crea los directorios necesarios para almacenar las imágenes
   */
  private async createDirectories(): Promise<void> {
    const smallDir = path.join(this.baseImagePath, 'small');
    const largeDir = path.join(this.baseImagePath, 'large');
    
    await fs.mkdir(smallDir, { recursive: true });
    await fs.mkdir(largeDir, { recursive: true });
  }

  /**
   * Descarga una imagen desde una URL y la guarda en el filepath especificado
   */
  private async downloadImage(
    url: string, 
    filepath: string, 
    retryCount: number = 3, 
    timeout: number = 30000
  ): Promise<'success' | 'skipped' | string> {
    try {
      // Verificar si el archivo ya existe
      try {
        await fs.access(filepath);
        return 'skipped';
      } catch {
        // El archivo no existe, continuar con la descarga
      }

      // Crear directorio si no existe
      await fs.mkdir(path.dirname(filepath), { recursive: true });

      for (let attempt = 0; attempt < retryCount; attempt++) {
        try {
          await this.downloadWithTimeout(url, filepath, timeout);
          return 'success';
        } catch (error) {
          if (attempt < retryCount - 1) {
            // Esperar antes del siguiente intento (backoff exponencial)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          } else {
            return `error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        }
      }
    } catch (error) {
      return `error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return 'error: max retries exceeded';
  }

  /**
   * Descarga un archivo con timeout
   */
  private async downloadWithTimeout(url: string, filepath: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const request = client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const writeStream = createWriteStream(filepath);
        
        pipeline(response, writeStream)
          .then(() => resolve())
          .catch(reject);
      });

      request.setTimeout(timeout, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      request.on('error', reject);
    });
  }

  /**
   * Procesa las cartas y recopila todas las tareas de descarga
   */
  private async collectDownloadTasks(
    cards: any[], 
    options: ImageDownloadOptions
  ): Promise<void> {
    this.downloadQueue = [];
    
    for (const card of cards) {
      const cardId = card.id || 'unknown';
      const images = card.images || {};
      
      // Agregar descarga de imagen pequeña
      if (options.downloadSmall !== false && images.small) {
        const filename = `${cardId}_small.png`;
        const filepath = path.join(this.baseImagePath, 'small', filename);
        this.downloadQueue.push({
          url: images.small,
          filepath,
          cardId,
          imageType: 'small'
        });
      }
      
      // Agregar descarga de imagen grande
      if (options.downloadLarge !== false && images.large) {
        const filename = `${cardId}_large.png`;
        const filepath = path.join(this.baseImagePath, 'large', filename);
        this.downloadQueue.push({
          url: images.large,
          filepath,
          cardId,
          imageType: 'large'
        });
      }
    }
    
    this.stats.total = this.downloadQueue.length;
  }

  /**
   * Procesa una tarea de descarga
   */
  private async processDownloadTask(
    task: typeof this.downloadQueue[0],
    options: ImageDownloadOptions
  ): Promise<void> {
    const result = await this.downloadImage(
      task.url, 
      task.filepath, 
      options.retryCount || 3, 
      options.timeout || 30000
    );
    
    const progress: DownloadProgress = {
      cardId: task.cardId,
      imageType: task.imageType,
      status: result === 'success' ? 'success' : result === 'skipped' ? 'skipped' : 'error',
      message: result.startsWith('error:') ? result : undefined
    };
    
    if (result === 'success') {
      this.stats.downloaded++;
    } else if (result === 'skipped') {
      this.stats.skipped++;
    } else {
      this.stats.errors++;
    }
    
    if (options.onProgress) {
      options.onProgress(progress);
    }
  }

  /**
   * Descarga imágenes de múltiples cartas de forma concurrente
   */
  async downloadImagesFromCards(
    cards: any[], 
    options: ImageDownloadOptions = {}
  ): Promise<DownloadStats> {
    // Resetear estadísticas
    this.stats = { downloaded: 0, errors: 0, skipped: 0, total: 0 };
    
    // Crear directorios
    await this.createDirectories();
    
    // Recopilar tareas de descarga
    await this.collectDownloadTasks(cards, options);
    
    if (this.downloadQueue.length === 0) {
      return this.stats;
    }
    
    const maxConcurrent = options.maxConcurrent || 10;
    const semaphore = new Array(maxConcurrent).fill(null);
    
    // Procesar descargas con concurrencia limitada
    const promises = this.downloadQueue.map(async (task) => {
      // Esperar por un slot disponible
      await new Promise<void>((resolve) => {
        const tryAcquire = () => {
          const index = semaphore.findIndex(slot => slot === null);
          if (index !== -1) {
            semaphore[index] = task;
            resolve();
          } else {
            setTimeout(tryAcquire, 10);
          }
        };
        tryAcquire();
      });
      
      try {
        await this.processDownloadTask(task, options);
      } finally {
        // Liberar el slot
        const index = semaphore.findIndex(slot => slot === task);
        if (index !== -1) {
          semaphore[index] = null;
        }
      }
    });
    
    await Promise.all(promises);
    
    return this.stats;
  }

  /**
   * Descarga imágenes desde archivos JSON de cartas
   */
  async downloadImagesFromJsonFiles(
    jsonFilePaths: string[], 
    options: ImageDownloadOptions = {}
  ): Promise<DownloadStats> {
    const allCards: any[] = [];
    
    // Leer todos los archivos JSON
    for (const filePath of jsonFilePaths) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const cards = JSON.parse(fileContent);
        allCards.push(...cards);
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
      }
    }
    
    return this.downloadImagesFromCards(allCards, options);
  }

  /**
   * Obtiene las estadísticas actuales
   */
  getStats(): DownloadStats {
    return { ...this.stats };
  }

  /**
   * Verifica si una imagen existe localmente
   */
  async imageExists(cardId: string, imageType: 'small' | 'large'): Promise<boolean> {
    const filename = `${cardId}_${imageType}.png`;
    const filepath = path.join(this.baseImagePath, imageType, filename);
    
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene la ruta local de una imagen
   */
  getImagePath(cardId: string, imageType: 'small' | 'large'): string {
    const filename = `${cardId}_${imageType}.png`;
    return path.join(this.baseImagePath, imageType, filename);
  }

  /**
   * Obtiene la URL pública de una imagen
   */
  getImageUrl(cardId: string, imageType: 'small' | 'large', baseUrl: string = ''): string {
    const filename = `${cardId}_${imageType}.png`;
    return `${baseUrl}/images/${imageType}/${filename}`;
  }
}

export const imageDownloadService = new ImageDownloadService();