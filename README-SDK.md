# Pokémon TCG SDK API

Esta documentación describe los endpoints disponibles para la nueva API del SDK de Pokémon TCG.

## Base URL
```
http://localhost:3000/api/pokemon-sdk
```

## Endpoints Disponibles

### Cartas

#### Buscar Cartas
```
GET /cards/search
```
**Parámetros de consulta:**
- `name` (string): Nombre de la carta
- `set` (string): ID del set
- `rarity` (string): Rareza de la carta
- `types` (string): Tipos de Pokémon
- `page` (number): Número de página (default: 1)
- `pageSize` (number): Tamaño de página (default: 20)

**Ejemplo:**
```
GET /cards/search?name=pikachu&pageSize=5
```

#### Obtener Carta por ID
```
GET /cards/:id
```
**Ejemplo:**
```
GET /cards/xy1-1
```

#### Buscar Cartas por Nombre
```
GET /cards/name/:name
```
**Ejemplo:**
```
GET /cards/name/charizard
```

### Sets

#### Obtener Todos los Sets
```
GET /sets
```

#### Obtener Set por ID
```
GET /sets/:id
```
**Ejemplo:**
```
GET /sets/base1
```

#### Obtener Cartas de un Set
```
GET /sets/:setId/cards
```
**Parámetros de consulta:**
- `page` (number): Número de página (default: 1)
- `pageSize` (number): Tamaño de página (default: 20)

**Ejemplo:**
```
GET /sets/base1/cards?page=1&pageSize=10
```

### Metadatos

#### Obtener Tipos
```
GET /types
```

#### Obtener Subtipos
```
GET /subtypes
```

#### Obtener Supertipos
```
GET /supertypes
```

### Utilidades

#### Estadísticas del Caché
```
GET /cache/stats
```
**Respuesta:**
```json
{
  "success": true,
  "data": {
    "hits": 0,
    "misses": 2,
    "keys": 0,
    "ksize": 0,
    "vsize": 0,
    "hitRate": 0,
    "missRate": 100
  }
}
```

#### Limpiar Caché
```
DELETE /cache
```
**Respuesta:**
```json
{
  "success": true,
  "message": "Caché limpiado exitosamente"
}
```

#### Health Check
```
GET /health
```
**Respuesta:**
```json
{
  "success": true,
  "message": "Pokémon TCG SDK API funcionando correctamente",
  "timestamp": "2025-08-23T16:02:05.283Z",
  "cache": {
    "stats": {
      "hits": 0,
      "misses": 0,
      "keys": 0,
      "ksize": 0,
      "vsize": 0,
      "hitRate": 0,
      "missRate": 0
    }
  }
}
```

## Formato de Respuesta

Todas las respuestas siguen el formato estándar:

### Respuesta Exitosa
```json
{
  "success": true,
  "data": { /* datos de respuesta */ },
  "page": 1,
  "pageSize": 20,
  "count": 5,
  "totalCount": 100
}
```

### Respuesta de Error
```json
{
  "success": false,
  "error": "Descripción del error",
  "details": "Detalles técnicos del error"
}
```

## Caché

La API utiliza un sistema de caché inteligente que:
- Almacena respuestas por 10 minutos para cartas
- Almacena respuestas por 30 minutos para sets
- Almacena respuestas por 1 hora para tipos y metadatos
- Proporciona estadísticas de rendimiento del caché

## Configuración

Para obtener mejores tiempos de respuesta, configure una API key de Pokémon TCG:

```bash
export POKEMON_TCG_API_KEY=your_api_key_here
```

## Estado Actual

### Servidor
- ✅ Servidor ejecutándose correctamente en puerto 3000
- ✅ API key detectada correctamente (hasApiKey: true, apiKeyLength: 36)
- ✅ Configuración de CORS habilitada
- ✅ **NUEVO**: Sistema de datos locales implementado

### Endpoints API Externa (pokemon-sdk)
- ✅ `/api/pokemon-sdk/cards/search` - **FUNCIONAL** (búsqueda de cartas por nombre)
- ⚠️ `/api/pokemon-sdk/sets` - Puede experimentar timeouts debido a latencia de API externa
- ⚠️ `/api/pokemon-sdk/types` - Puede experimentar timeouts debido a latencia de API externa

### Endpoints Datos Locales (pokemon) - **NUEVO**
- ✅ `/api/pokemon/cards/search` - Búsqueda de cartas local (rápida)
- ✅ `/api/pokemon/cards/:id` - Obtener carta por ID
- ✅ `/api/pokemon/sets` - Obtener todos los sets
- ✅ `/api/pokemon/sets/:id` - Obtener set por ID
- ✅ `/api/pokemon/sets/:id/cards` - Obtener cartas de un set
- ✅ `/api/pokemon/metadata` - Obtener tipos, supertipos, etc.
- ✅ `/api/pokemon/stats` - Estadísticas del sistema
- ✅ `/api/pokemon/health` - Health check
- ✅ `/api/pokemon/cache/clear` - Limpiar cache

### Ventajas del Sistema Local
- 🚀 **Velocidad**: Sin dependencia de API externa
- 📊 **Datos completos**: Acceso a toda la base de datos pokemon-tcg-data v2.15
- 💾 **Cache inteligente**: Sistema de cache para optimizar rendimiento
- 🔄 **Confiabilidad**: Sin timeouts ni límites de rate limiting

## Notas

- Se recomienda usar los endpoints locales (`/api/pokemon/*`) para mejor rendimiento
- Los endpoints de API externa siguen disponibles como respaldo
- El sistema local incluye más de 20,000 cartas y todos los sets oficiales
- Sin API key, las consultas a la API externa pueden experimentar timeouts debido a los límites de rate limiting
- El sistema de caché ayuda a reducir la carga en la API externa
- Todos los endpoints soportan CORS para uso desde aplicaciones web frontend