# Pokémon TCG Local Data API

## Descripción

Sistema de datos locales para Pokémon TCG que utiliza la base de datos completa del repositorio `pokemon-tcg-data` v2.15. Este sistema proporciona acceso rápido y confiable a más de 19,000 cartas y 168 sets sin depender de APIs externas.

## Características

- 🚀 **Ultra rápido**: Sin latencia de red
- 📊 **Datos completos**: 19,465 cartas y 168 sets
- 💾 **Cache inteligente**: Optimización automática de rendimiento
- 🔄 **100% confiable**: Sin timeouts ni límites de rate limiting
- 🎯 **Búsqueda avanzada**: Múltiples criterios de filtrado

## Endpoints Disponibles

### Base URL
```
http://localhost:3000/api/pokemon
```

### 1. Búsqueda de Cartas
```http
GET /cards/search
```

**Parámetros de consulta:**
- `name` (string): Nombre de la carta
- `type` (string): Tipo de Pokémon (Fire, Water, etc.)
- `supertype` (string): Supertipo (Pokémon, Trainer, Energy)
- `subtype` (string): Subtipo (Basic, Stage 1, etc.)
- `rarity` (string): Rareza de la carta
- `set` (string): ID o nombre del set
- `pageSize` (number): Tamaño de página (máx. 250, default: 20)
- `page` (number): Número de página (default: 1)

**Ejemplo:**
```http
GET /cards/search?name=pikachu&pageSize=5
```

### 2. Obtener Carta por ID
```http
GET /cards/:id
```

**Ejemplo:**
```http
GET /cards/base1-58
```

### 3. Obtener Sets
```http
GET /sets
```

**Parámetros de consulta:**
- `name` (string): Filtrar por nombre del set
- `pageSize` (number): Tamaño de página (máx. 250, default: 20)
- `page` (number): Número de página (default: 1)

**Ejemplo:**
```http
GET /sets?pageSize=10
```

### 4. Obtener Set por ID
```http
GET /sets/:id
```

**Ejemplo:**
```http
GET /sets/base1
```

### 5. Obtener Cartas de un Set
```http
GET /sets/:id/cards
```

**Parámetros de consulta:**
- `pageSize` (number): Tamaño de página (máx. 250, default: 20)
- `page` (number): Número de página (default: 1)

**Ejemplo:**
```http
GET /sets/base1/cards?pageSize=20
```

### 6. Obtener Metadatos
```http
GET /metadata
```

Devuelve todos los tipos, supertipos, subtipos y rarezas disponibles.

### 7. Estadísticas del Sistema
```http
GET /stats
```

Devuelve estadísticas del sistema incluyendo número de cartas, sets y estado del cache.

### 8. Health Check
```http
GET /health
```

Verifica el estado del servicio de datos locales.

### 9. Limpiar Cache
```http
POST /cache/clear
```

Limpia el cache interno del sistema.

## Estructura de Respuesta

Todas las respuestas siguen el siguiente formato:

```json
{
  "success": true,
  "data": [...],
  "page": 1,
  "pageSize": 20,
  "count": 5,
  "totalCount": 100,
  "source": "local"
}
```

### Campos de Respuesta
- `success`: Indica si la operación fue exitosa
- `data`: Datos solicitados (cartas, sets, etc.)
- `page`: Página actual (solo en endpoints paginados)
- `pageSize`: Tamaño de página (solo en endpoints paginados)
- `count`: Número de elementos en la respuesta actual
- `totalCount`: Total de elementos disponibles
- `source`: Fuente de los datos (`local`, `local-cache`)

## Estructura de Datos

### Carta (PokemonCard)
```json
{
  "id": "base1-58",
  "name": "Pikachu",
  "supertype": "Pokémon",
  "subtypes": ["Basic"],
  "hp": "40",
  "types": ["Lightning"],
  "attacks": [...],
  "weaknesses": [...],
  "retreatCost": ["Colorless"],
  "rarity": "Common",
  "artist": "Mitsuhiro Arita",
  "images": {
    "small": "https://images.pokemontcg.io/base1/58.png",
    "large": "https://images.pokemontcg.io/base1/58_hires.png"
  },
  "set": {
    "id": "base1",
    "name": "Base",
    "series": "Base",
    "releaseDate": "1999/01/09"
  }
}
```

### Set (PokemonSet)
```json
{
  "id": "base1",
  "name": "Base",
  "series": "Base",
  "printedTotal": 102,
  "total": 102,
  "releaseDate": "1999/01/09",
  "images": {
    "symbol": "https://images.pokemontcg.io/base1/symbol.png",
    "logo": "https://images.pokemontcg.io/base1/logo.png"
  }
}
```

## Rendimiento

### Tiempos de Respuesta Típicos
- Búsqueda de cartas: < 50ms
- Obtener sets: < 30ms
- Metadatos: < 20ms (con cache)
- Health check: < 10ms

### Sistema de Cache
- Cache automático para consultas frecuentes
- TTL configurable por tipo de consulta
- Limpieza automática de cache obsoleto

## Comparación con API Externa

| Característica | API Local | API Externa |
|---|---|---|
| Velocidad | < 50ms | 500-5000ms |
| Confiabilidad | 100% | ~95% (timeouts) |
| Datos disponibles | 19,465 cartas | Limitado por rate limit |
| Dependencias | Ninguna | Internet + API key |
| Costo | Gratis | Limitado por plan |

## Casos de Uso Recomendados

1. **Desarrollo y testing**: Sin dependencias externas
2. **Producción**: Mayor confiabilidad y velocidad
3. **Aplicaciones offline**: Funciona sin conexión a internet
4. **Búsquedas complejas**: Filtrado avanzado sin límites
5. **Análisis de datos**: Acceso completo a toda la base de datos

## Notas Técnicas

- Los datos se cargan en memoria al iniciar el servidor
- Tiempo de inicialización: ~2-3 segundos
- Uso de memoria: ~200-300MB
- Compatible con todas las versiones de Node.js 16+

## Próximas Mejoras

- [ ] Sistema de descarga automática de imágenes
- [ ] Actualización automática de datos
- [ ] API de estadísticas avanzadas
- [ ] Soporte para búsqueda por texto completo
- [ ] Exportación de datos en diferentes formatos