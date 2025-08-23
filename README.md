# PokeCollect Backend

Backend API para la aplicación PokeCollect, un sistema completo para coleccionar y gestionar cartas de Pokémon TCG.

## Características Principales

- 🃏 **API completa de Pokémon TCG**: Acceso a más de 19,000 cartas y 168 sets
- 🚀 **Datos locales de alta velocidad**: Sistema de datos local para máximo rendimiento
- 🔄 **Actualización automática**: Sistema inteligente de actualización de datos
- 📊 **Gestión de colecciones**: CRUD completo para colecciones de usuarios
- 💳 **Integración con Stripe**: Procesamiento de pagos seguro
- 📧 **Sistema de contacto**: Integración con Brevo para emails
- 🔍 **Búsqueda avanzada**: Filtros por nombre, tipo, rareza, set, etc.
- ⚡ **Cache inteligente**: Sistema de caché para optimizar rendimiento
- 🛡️ **Validación robusta**: Validación completa de datos y errores

## Tecnologías

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Base de datos**: PostgreSQL (con Prisma ORM)
- **Datos Pokemon**: Sistema local basado en pokemon-tcg-data v2.15
- **Pagos**: Stripe
- **Emails**: Brevo (Sendinblue)
- **Desarrollo**: ts-node-dev, nodemon

## Instalación

### Prerrequisitos

- Node.js 18+
- npm o yarn
- PostgreSQL (opcional, para colecciones)
- Git

### Configuración

1. **Clonar el repositorio**

```bash
git clone <repository-url>
cd PokeCollect-backend
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:

```bash
# Server
PORT=3000

# Auto-Update System
AUTO_UPDATE_ENABLED=false
AUTO_UPDATE_CHECK_INTERVAL_HOURS=24

# Sanity (para imágenes CDN)
SANITY_API_TOKEN="tu_token_de_sanity"

# Database (opcional)
DATABASE_URL="postgresql://user:password@localhost:5432/pokecollect"

# Stripe (opcional)
STRIPE_SECRET_KEY="sk_test_..."

# Brevo (opcional)
BREVO_API_KEY="xkeysib-..."
```

4. **Inicializar datos de Pokémon**

```bash
# Los datos se descargan automáticamente al iniciar el servidor
npm run dev
```

## Uso

### Desarrollo

```bash
npm run dev
```

### Producción

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

## API Endpoints

### Pokémon TCG

#### Búsqueda de Cartas

```http
GET /api/pokemon/cards/search?name=pikachu&pageSize=20
GET /api/pokemon/cards/search?type=Electric&rarity=Rare
GET /api/pokemon/cards/search?set=base1&supertype=Pokemon
```

#### Cartas Específicas

```http
GET /api/pokemon/cards/:id
```

#### Sets

```http
GET /api/pokemon/sets
GET /api/pokemon/sets/:id
GET /api/pokemon/sets/:id/cards
```

#### Metadatos

```http
GET /api/pokemon/metadata/types
GET /api/pokemon/metadata/supertypes
GET /api/pokemon/metadata/subtypes
GET /api/pokemon/metadata/rarities
```

#### Sistema

```http
GET /api/pokemon/health
GET /api/pokemon/stats
POST /api/pokemon/cache/clear
```

### Sistema de Auto-Update

#### Estado y Monitoreo

```http
GET /api/auto-update/health
GET /api/auto-update/status
GET /api/auto-update/history
```

#### Control Manual

```http
POST /api/auto-update/check
POST /api/auto-update/update
PUT /api/auto-update/config
```

### Colecciones (Opcional)

```http
GET /api/collections
POST /api/collections
GET /api/collections/:id
PUT /api/collections/:id
DELETE /api/collections/:id
```

### Imágenes con Sanity

```http
GET /api/sanity-images/card/:cardId
GET /api/sanity-images/card/:cardId/:imageType
GET /api/sanity-images/check/:cardId
POST /api/sanity-images/migrate/card/:cardId
POST /api/sanity-images/migrate/set/:setId
POST /api/sanity-images/migrate/all
curl -X POST "https://pokecollect-backend.onrender.com/api/sanity-images/migrate/all" \
  -H "Content-Type: application/json" \
  -d '{"confirm": "YES_MIGRATE_ALL"}'
GET /api/sanity-images/stats
GET /api/sanity-images/test
```

### Otros

```http
POST /api/contact
POST /api/stripe/webhook
```

## Sistema de Datos Local

El backend utiliza un sistema de datos local de alta velocidad basado en el repositorio oficial `pokemon-tcg-data`:

### Ventajas

- ⚡ **Velocidad**: Respuestas en <50ms vs 500-2000ms de APIs externas
- 🛡️ **Confiabilidad**: Sin dependencia de servicios externos
- 📊 **Datos completos**: Acceso a todos los datos sin límites de rate
- 🔄 **Actualización automática**: Sistema inteligente de actualización
- 💰 **Sin costos**: No hay límites de requests ni costos por uso

### Rendimiento

- **Health check**: ~5ms
- **Búsqueda de cartas**: ~20-50ms
- **Listado de sets**: ~10ms
- **Metadatos**: ~5ms
- **Caché**: Datos en memoria para máxima velocidad

## Sistema de Imágenes con Sanity

El backend utiliza Sanity como CDN para servir las imágenes de las cartas Pokémon de forma optimizada:

### Características

- 🖼️ **CDN Global**: Imágenes servidas desde Sanity CDN para máxima velocidad
- 📦 **Migración automática**: Sistema de migración de imágenes desde URLs originales
- 🔄 **Optimización dual**: Cliente separado para lectura (CDN) y escritura
- 📊 **Estadísticas**: Monitoreo completo del estado de migración
- ⚡ **Cache inteligente**: Respuestas optimizadas con CDN

### Migración de Imágenes

Para migrar todas las imágenes a Sanity:

```bash
# Migrar todas las imágenes (proceso completo)
curl -X POST http://localhost:3001/api/sanity-images/migrate/all

# Verificar estadísticas de migración
curl http://localhost:3001/api/sanity-images/stats

# Probar conexión con Sanity
curl http://localhost:3001/api/sanity-images/test
```

### Migración por Sets o Cartas Específicas

```bash
# Migrar todas las imágenes de un set específico
curl -X POST http://localhost:3001/api/sanity-images/migrate/set/base1

# Migrar imagen de una carta específica
curl -X POST http://localhost:3001/api/sanity-images/migrate/card/base1-4

# Verificar si existe imagen para una carta
curl http://localhost:3001/api/sanity-images/check/base1-4
```

### Obtener Imágenes

```bash
# Obtener imagen de una carta (ambos tamaños)
curl http://localhost:3001/api/sanity-images/card/base1-4

# Obtener imagen específica (small o large)
curl http://localhost:3001/api/sanity-images/card/base1-4/small
curl http://localhost:3001/api/sanity-images/card/base1-4/large
```

## Sistema de Auto-Update

Sistema inteligente que mantiene los datos siempre actualizados:

### Características

- 🔄 **Verificación automática**: Cada 24 horas por defecto
- 📦 **Descarga inteligente**: Solo descarga cuando hay nuevas versiones
- 💾 **Sistema de backup**: Backup automático antes de cada actualización
- ✅ **Validación**: Verifica integridad de datos antes de instalar
- 🔙 **Rollback automático**: Restaura backup en caso de error
- 🎛️ **Control total**: API completa para monitoreo y control

### Configuración

```bash
# Habilitar auto-update
AUTO_UPDATE_ENABLED=true

# Verificar cada 12 horas
AUTO_UPDATE_CHECK_INTERVAL_HOURS=12
```

### Uso

```bash
# Verificar estado
curl http://localhost:3000/api/auto-update/status

# Forzar verificación
curl -X POST http://localhost:3000/api/auto-update/check

# Habilitar auto-update
curl -X PUT http://localhost:3000/api/auto-update/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

## Estructura del Proyecto

```
src/
├── controllers/          # Controladores de rutas
│   ├── pokemon.controller.ts
│   ├── auto-update.controller.ts
│   └── collections.controller.ts
├── routes/              # Definición de rutas
│   ├── pokemon.routes.ts
│   ├── auto-update.routes.ts
│   └── collections.routes.ts
├── lib/                 # Servicios y utilidades
│   ├── local-pokemon-data.ts
│   ├── auto-update-service.ts
│   └── validation.ts
├── types/               # Definiciones de tipos
└── index.ts            # Punto de entrada

data/
├── pokemon-tcg/        # Datos actuales
├── pokemon-tcg-backup/ # Backup de seguridad
└── update-status.json  # Estado del auto-update
```

## Documentación Adicional

- [📖 API de Pokémon Local](./POKEMON-LOCAL-API.md) - Documentación completa de la API
- [🔄 Sistema de Auto-Update](./AUTO-UPDATE-SYSTEM.md) - Guía completa del sistema de actualización
- [📊 SDK Documentation](./README-SDK.md) - Documentación del SDK anterior

## Desarrollo

### Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar TypeScript
npm start           # Ejecutar versión compilada
npm test            # Ejecutar tests
npm run lint        # Linter
npm run format      # Formatear código
```

### Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Debugging

```bash
# Logs detallados
DEBUG=* npm run dev

# Solo logs de Pokemon
DEBUG=pokemon:* npm run dev

# Verificar estado del sistema
curl http://localhost:3000/api/pokemon/health
curl http://localhost:3000/api/auto-update/health
```

## Deployment

### Variables de Entorno Requeridas

```bash
# Básicas
PORT=3000
NODE_ENV=production

# Auto-Update (recomendado en producción)
AUTO_UPDATE_ENABLED=true
AUTO_UPDATE_CHECK_INTERVAL_HOURS=24

# Sanity (requerido para imágenes)
SANITY_API_TOKEN=tu_token_de_sanity

# Opcionales
DATABASE_URL=...
STRIPE_SECRET_KEY=...
BREVO_API_KEY=...
```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## Soporte

Para soporte y preguntas:

- 📧 Email: support@pokecollect.com
- 🐛 Issues: GitHub Issues
- 📖 Docs: Ver documentación en `/docs`

---

**PokeCollect Backend** - Sistema completo y eficiente para gestionar datos de Pokémon TCG con actualización automática y máximo rendimiento.
