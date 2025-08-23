import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { localPokemonData } from './local-pokemon-data';

const execAsync = promisify(exec);

interface UpdateConfig {
  checkIntervalHours: number;
  repositoryUrl: string;
  dataPath: string;
  backupPath: string;
  enabled: boolean;
}

interface UpdateStatus {
  lastCheck: Date;
  lastUpdate: Date;
  currentVersion: string;
  latestVersion: string;
  isUpdating: boolean;
  updateAvailable: boolean;
  error?: string;
}

export class AutoUpdateService {
  private config: UpdateConfig;
  private status: UpdateStatus;
  private updateInterval?: NodeJS.Timeout;

  constructor() {
    this.config = {
      checkIntervalHours: parseInt(process.env.AUTO_UPDATE_CHECK_INTERVAL_HOURS || '24'),
      repositoryUrl: process.env.AUTO_UPDATE_REPOSITORY_URL || 'https://github.com/PokemonTCG/pokemon-tcg-data',
      dataPath: path.join(process.cwd(), 'data', 'pokemon-tcg'),
      backupPath: path.join(process.cwd(), 'data', 'pokemon-tcg-backup'),
      enabled: process.env.AUTO_UPDATE_ENABLED === 'true'
    };

    this.status = {
      lastCheck: new Date(0),
      lastUpdate: new Date(0),
      currentVersion: 'v2.15',
      latestVersion: 'v2.15',
      isUpdating: false,
      updateAvailable: false
    };

    this.loadStatus();
  }

  /**
   * Inicia el servicio de actualización automática
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('🔄 Auto-update service is disabled');
      return;
    }

    console.log('🚀 Starting auto-update service...');
    console.log(`📅 Check interval: ${this.config.checkIntervalHours} hours`);
    
    // Verificar inmediatamente al iniciar
    this.checkForUpdates();
    
    // Programar verificaciones periódicas
    this.updateInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkIntervalHours * 60 * 60 * 1000);
  }

  /**
   * Detiene el servicio de actualización automática
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
      console.log('⏹️ Auto-update service stopped');
    }
  }

  /**
   * Verifica si hay actualizaciones disponibles
   */
  async checkForUpdates(): Promise<boolean> {
    if (this.status.isUpdating) {
      console.log('⏳ Update already in progress, skipping check');
      return false;
    }

    try {
      console.log('🔍 Checking for updates...');
      this.status.lastCheck = new Date();
      this.status.error = undefined;

      const latestVersion = await this.getLatestVersion();
      this.status.latestVersion = latestVersion;

      if (this.isNewerVersion(latestVersion, this.status.currentVersion)) {
        console.log(`📦 New version available: ${latestVersion} (current: ${this.status.currentVersion})`);
        this.status.updateAvailable = true;
        
        // Auto-update si está habilitado
        if (this.config.enabled) {
          await this.performUpdate();
        }
        
        this.saveStatus();
        return true;
      } else {
        console.log('✅ No updates available');
        this.status.updateAvailable = false;
        this.saveStatus();
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      this.saveStatus();
      return false;
    }
  }

  /**
   * Realiza la actualización de datos
   */
  async performUpdate(): Promise<boolean> {
    if (this.status.isUpdating) {
      throw new Error('Update already in progress');
    }

    try {
      console.log('🔄 Starting data update...');
      this.status.isUpdating = true;
      this.saveStatus();

      // 1. Crear backup de los datos actuales
      await this.createBackup();

      // 2. Descargar nueva versión
      const tempPath = await this.downloadLatestData();

      // 3. Validar los nuevos datos
      const isValid = await this.validateData(tempPath);
      if (!isValid) {
        throw new Error('Downloaded data validation failed');
      }

      // 4. Reemplazar datos actuales
      await this.replaceData(tempPath);

      // 5. Recargar datos en memoria
      await this.reloadData();

      // 6. Actualizar estado
      this.status.currentVersion = this.status.latestVersion;
      this.status.lastUpdate = new Date();
      this.status.updateAvailable = false;
      this.status.isUpdating = false;
      this.status.error = undefined;

      console.log(`✅ Update completed successfully to version ${this.status.currentVersion}`);
      this.saveStatus();
      return true;

    } catch (error) {
      console.error('❌ Update failed:', error);
      this.status.error = error instanceof Error ? error.message : 'Update failed';
      this.status.isUpdating = false;
      
      // Intentar restaurar backup
      try {
        await this.restoreBackup();
        console.log('🔄 Backup restored successfully');
      } catch (restoreError) {
        console.error('❌ Failed to restore backup:', restoreError);
      }
      
      this.saveStatus();
      return false;
    }
  }

  /**
   * Obtiene la última versión disponible del repositorio
   */
  private async getLatestVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `git ls-remote --tags ${this.config.repositoryUrl} | grep -E 'refs/tags/v[0-9]+\.[0-9]+$' | sort -V | tail -1`
      );
      
      const match = stdout.match(/refs\/tags\/(v[0-9]+\.[0-9]+)/);
      if (match) {
        return match[1];
      }
      
      throw new Error('Could not parse latest version');
    } catch (error) {
      console.error('Error getting latest version:', error);
      throw error;
    }
  }

  /**
   * Compara versiones para determinar si una es más nueva
   */
  private isNewerVersion(version1: string, version2: string): boolean {
    const v1Parts = version1.replace('v', '').split('.').map(Number);
    const v2Parts = version2.replace('v', '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return true;
      if (v1Part < v2Part) return false;
    }
    
    return false;
  }

  /**
   * Crea un backup de los datos actuales
   */
  private async createBackup(): Promise<void> {
    console.log('💾 Creating backup...');
    
    if (fs.existsSync(this.config.backupPath)) {
      await execAsync(`rm -rf "${this.config.backupPath}"`);
    }
    
    await execAsync(`cp -r "${this.config.dataPath}" "${this.config.backupPath}"`);
    console.log('✅ Backup created successfully');
  }

  /**
   * Descarga los datos más recientes
   */
  private async downloadLatestData(): Promise<string> {
    console.log('⬇️ Downloading latest data...');
    
    const tempPath = path.join(process.cwd(), 'temp-pokemon-data');
    
    if (fs.existsSync(tempPath)) {
      await execAsync(`rm -rf "${tempPath}"`);
    }
    
    await execAsync(
      `git clone --depth 1 --branch ${this.status.latestVersion} ${this.config.repositoryUrl} "${tempPath}"`
    );
    
    console.log('✅ Data downloaded successfully');
    return tempPath;
  }

  /**
   * Valida que los datos descargados sean correctos
   */
  private async validateData(dataPath: string): Promise<boolean> {
    console.log('🔍 Validating downloaded data...');
    
    try {
      // Verificar que existan las carpetas principales
      const requiredFolders = ['cards', 'sets'];
      for (const folder of requiredFolders) {
        const folderPath = path.join(dataPath, folder);
        if (!fs.existsSync(folderPath)) {
          console.error(`❌ Missing required folder: ${folder}`);
          return false;
        }
      }
      
      // Verificar que exista el archivo de sets
      const setsFile = path.join(dataPath, 'sets', 'en.json');
      if (!fs.existsSync(setsFile)) {
        console.error('❌ Missing sets file: sets/en.json');
        return false;
      }
      
      // Verificar que el archivo de sets sea válido JSON
      const setsContent = fs.readFileSync(setsFile, 'utf8');
      const sets = JSON.parse(setsContent);
      
      if (!Array.isArray(sets) || sets.length === 0) {
        console.error('❌ Invalid sets data');
        return false;
      }
      
      console.log(`✅ Data validation passed (${sets.length} sets found)`);
      return true;
      
    } catch (error) {
      console.error('❌ Data validation failed:', error);
      return false;
    }
  }

  /**
   * Reemplaza los datos actuales con los nuevos
   */
  private async replaceData(newDataPath: string): Promise<void> {
    console.log('🔄 Replacing current data...');
    
    // Eliminar datos actuales
    await execAsync(`rm -rf "${this.config.dataPath}"`);
    
    // Mover nuevos datos
    await execAsync(`mv "${newDataPath}" "${this.config.dataPath}"`);
    
    console.log('✅ Data replaced successfully');
  }

  /**
   * Recarga los datos en memoria
   */
  private async reloadData(): Promise<void> {
    console.log('🔄 Reloading data in memory...');
    
    // Limpiar caché y recargar datos
    localPokemonData.clearCache();
    
    // Forzar recarga de sets y cartas accediendo a ellos
    await localPokemonData.getSets();
    await localPokemonData.getAllCards();
    
    console.log('✅ Data reloaded successfully');
  }

  /**
   * Restaura el backup en caso de error
   */
  private async restoreBackup(): Promise<void> {
    if (!fs.existsSync(this.config.backupPath)) {
      throw new Error('No backup available to restore');
    }
    
    console.log('🔄 Restoring backup...');
    
    await execAsync(`rm -rf "${this.config.dataPath}"`);
    await execAsync(`mv "${this.config.backupPath}" "${this.config.dataPath}"`);
    
    // Recargar datos del backup
    await this.reloadData();
  }

  /**
   * Carga el estado desde archivo
   */
  private loadStatus(): void {
    const statusFile = path.join(process.cwd(), 'data', 'update-status.json');
    
    if (fs.existsSync(statusFile)) {
      try {
        const statusData = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        this.status = {
          ...this.status,
          ...statusData,
          lastCheck: new Date(statusData.lastCheck),
          lastUpdate: new Date(statusData.lastUpdate),
          isUpdating: false // Siempre resetear al iniciar
        };
      } catch (error) {
        console.error('Error loading update status:', error);
      }
    }
  }

  /**
   * Guarda el estado en archivo
   */
  private saveStatus(): void {
    const statusFile = path.join(process.cwd(), 'data', 'update-status.json');
    
    try {
      const dataDir = path.dirname(statusFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(statusFile, JSON.stringify(this.status, null, 2));
    } catch (error) {
      console.error('Error saving update status:', error);
    }
  }

  /**
   * Obtiene el estado actual del servicio
   */
  getStatus(): UpdateStatus {
    return { ...this.status };
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): UpdateConfig {
    return { ...this.config };
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(newConfig: Partial<UpdateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reiniciar el servicio si cambió el intervalo
    if (newConfig.checkIntervalHours && this.updateInterval) {
      this.stop();
      this.start();
    }
  }

  /**
   * Fuerza una verificación manual de actualizaciones
   */
  async forceCheck(): Promise<boolean> {
    console.log('🔄 Manual update check triggered');
    return await this.checkForUpdates();
  }

  /**
   * Fuerza una actualización manual
   */
  async forceUpdate(): Promise<boolean> {
    console.log('🔄 Manual update triggered');
    
    // Primero verificar si hay actualizaciones
    const hasUpdates = await this.checkForUpdates();
    
    if (hasUpdates || this.status.updateAvailable) {
      return await this.performUpdate();
    } else {
      console.log('ℹ️ No updates available to install');
      return false;
    }
  }
}

// Instancia singleton del servicio
export const autoUpdateService = new AutoUpdateService();