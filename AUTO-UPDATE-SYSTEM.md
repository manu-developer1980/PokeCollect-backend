# Sistema de Actualización Automática

Este documento describe el sistema de actualización automática implementado en el backend de PokeCollect para mantener los datos de Pokémon TCG siempre actualizados.

## Características

- ✅ **Verificación automática**: Verifica periódicamente si hay nuevas versiones del repositorio pokemon-tcg-data
- ✅ **Actualización automática**: Descarga e instala automáticamente las nuevas versiones
- ✅ **Sistema de backup**: Crea respaldos antes de cada actualización
- ✅ **Validación de datos**: Verifica la integridad de los datos descargados
- ✅ **Rollback automático**: Restaura el backup en caso de error
- ✅ **API de control**: Endpoints para monitorear y controlar el sistema
- ✅ **Configuración flexible**: Configurable mediante variables de entorno y API

## Configuración

### Variables de Entorno

```bash
# Habilitar/deshabilitar el sistema de actualización automática
AUTO_UPDATE_ENABLED=true

# Intervalo de verificación en horas (por defecto 24 horas)
AUTO_UPDATE_CHECK_INTERVAL_HOURS=24

# URL del repositorio de datos Pokemon TCG
AUTO_UPDATE_REPOSITORY_URL=https://github.com/PokemonTCG/pokemon-tcg-data
```

### Configuración por Defecto

- **Habilitado**: `false` (por seguridad)
- **Intervalo de verificación**: `24 horas`
- **Repositorio**: `https://github.com/PokemonTCG/pokemon-tcg-data`

## API Endpoints

### 1. Health Check
```http
GET /api/auto-update/health
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "service": "Auto-Update Service",
    "status": "healthy",
    "enabled": true,
    "currentVersion": "v2.15",
    "latestVersion": "v2.15",
    "updateAvailable": false,
    "lastCheck": "2025-08-23T16:32:42.509Z",
    "lastUpdate": "2025-08-23T15:30:00.000Z",
    "error": null,
    "timestamp": "2025-08-23T16:33:00.000Z"
  }
}
```

### 2. Estado del Sistema
```http
GET /api/auto-update/status
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "status": {
      "lastCheck": "2025-08-23T16:32:42.509Z",
      "lastUpdate": "2025-08-23T15:30:00.000Z",
      "currentVersion": "v2.15",
      "latestVersion": "v2.15",
      "isUpdating": false,
      "updateAvailable": false
    },
    "config": {
      "enabled": true,
      "checkIntervalHours": 24,
      "repositoryUrl": "https://github.com/PokemonTCG/pokemon-tcg-data"
    }
  }
}
```

### 3. Verificar Actualizaciones
```http
POST /api/auto-update/check
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "hasUpdates": false,
    "status": {
      "currentVersion": "v2.15",
      "latestVersion": "v2.15",
      "updateAvailable": false,
      "lastCheck": "2025-08-23T16:33:00.000Z",
      "error": null
    }
  }
}
```

### 4. Ejecutar Actualización Manual
```http
POST /api/auto-update/update
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Update started successfully",
  "data": {
    "message": "Update is being performed in the background. Check status endpoint for progress."
  }
}
```

### 5. Actualizar Configuración
```http
PUT /api/auto-update/config
Content-Type: application/json

{
  "enabled": true,
  "checkIntervalHours": 12
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "config": {
      "enabled": true,
      "checkIntervalHours": 12,
      "repositoryUrl": "https://github.com/PokemonTCG/pokemon-tcg-data"
    }
  }
}
```

### 6. Historial de Actualizaciones
```http
GET /api/auto-update/history
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "lastUpdate": "2025-08-23T15:30:00.000Z",
    "lastCheck": "2025-08-23T16:33:00.000Z",
    "currentVersion": "v2.15",
    "updates": [
      {
        "version": "v2.15",
        "date": "2025-08-23T15:30:00.000Z",
        "status": "completed"
      }
    ]
  }
}
```

## Proceso de Actualización

### 1. Verificación
- Consulta la última versión disponible en GitHub
- Compara con la versión actual
- Actualiza el estado del sistema

### 2. Descarga
- Clona el repositorio con la nueva versión
- Descarga solo los archivos necesarios
- Valida la integridad de los datos

### 3. Backup
- Crea una copia de seguridad de los datos actuales
- Almacena el backup en directorio separado
- Mantiene información de versión

### 4. Instalación
- Reemplaza los datos actuales con los nuevos
- Recarga los datos en memoria
- Actualiza el caché del sistema

### 5. Verificación Post-Instalación
- Verifica que los nuevos datos sean válidos
- Confirma que el sistema funciona correctamente
- Actualiza el estado de la versión

### 6. Rollback (si es necesario)
- Restaura el backup en caso de error
- Recarga los datos anteriores
- Registra el error para diagnóstico

## Estructura de Archivos

```
data/
├── pokemon-tcg/           # Datos actuales
│   ├── cards/
│   └── sets/
├── pokemon-tcg-backup/    # Backup de seguridad
│   ├── cards/
│   └── sets/
└── update-status.json     # Estado del sistema
```

## Logs y Monitoreo

El sistema genera logs detallados de todas las operaciones:

```
🔍 Checking for updates...
📦 New version available: v2.16 (current: v2.15)
🔄 Starting data update...
💾 Creating backup...
✅ Backup created successfully
⬇️ Downloading latest data...
✅ Data downloaded successfully
🔍 Validating downloaded data...
✅ Data validation passed (168 sets found)
🔄 Replacing current data...
✅ Data replaced successfully
🔄 Reloading data in memory...
✅ Data reloaded successfully
✅ Update completed successfully to version v2.16
```

## Seguridad y Confiabilidad

### Medidas de Seguridad
- ✅ Validación de datos antes de la instalación
- ✅ Sistema de backup automático
- ✅ Rollback automático en caso de error
- ✅ Verificación de integridad de archivos
- ✅ Control de acceso a endpoints de configuración

### Manejo de Errores
- ✅ Captura y registro de todos los errores
- ✅ Restauración automática del backup
- ✅ Notificación de errores en el estado
- ✅ Continuidad del servicio en caso de fallo

## Uso Recomendado

### Para Desarrollo
```bash
# Deshabilitar auto-update en desarrollo
AUTO_UPDATE_ENABLED=false
```

### Para Producción
```bash
# Habilitar con verificación diaria
AUTO_UPDATE_ENABLED=true
AUTO_UPDATE_CHECK_INTERVAL_HOURS=24
```

### Para Testing
```bash
# Verificación más frecuente para pruebas
AUTO_UPDATE_ENABLED=true
AUTO_UPDATE_CHECK_INTERVAL_HOURS=1
```

## Comandos Útiles

### Verificar Estado
```bash
curl http://localhost:3000/api/auto-update/status | jq
```

### Forzar Verificación
```bash
curl -X POST http://localhost:3000/api/auto-update/check | jq
```

### Habilitar Auto-Update
```bash
curl -X PUT http://localhost:3000/api/auto-update/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}' | jq
```

### Ejecutar Actualización Manual
```bash
curl -X POST http://localhost:3000/api/auto-update/update | jq
```

## Troubleshooting

### Problema: El servicio no se inicia
**Solución**: Verificar que las variables de entorno estén configuradas correctamente.

### Problema: Falla la descarga de datos
**Solución**: Verificar conectividad a internet y acceso al repositorio de GitHub.

### Problema: Error en la validación de datos
**Solución**: Los datos descargados pueden estar corruptos. El sistema automáticamente restaurará el backup.

### Problema: El servicio está "stuck" en updating
**Solución**: Reiniciar el servidor. El estado se resetea automáticamente al iniciar.

## Contribución

Para contribuir al sistema de auto-update:

1. Revisar el código en `src/lib/auto-update-service.ts`
2. Agregar tests para nuevas funcionalidades
3. Actualizar esta documentación
4. Probar en entorno de desarrollo antes de producción

## Changelog

### v1.0.0 (2025-08-23)
- ✅ Implementación inicial del sistema de auto-update
- ✅ API completa para control y monitoreo
- ✅ Sistema de backup y rollback
- ✅ Validación de datos
- ✅ Configuración mediante variables de entorno
- ✅ Documentación completa