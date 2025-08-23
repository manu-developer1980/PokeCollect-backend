import { Router } from 'express';
import { PokemonController } from '../controllers/pokemon.controller';

const router = Router();

// Rutas para cartas
router.get('/cards/search', PokemonController.searchCards);
router.get('/cards/:id', PokemonController.getCardById);

// Rutas para sets
router.get('/sets', PokemonController.getSets);
router.get('/sets/:id', PokemonController.getSetById);
router.get('/sets/:id/cards', PokemonController.getCardsBySet);

// Rutas para metadatos
router.get('/metadata', PokemonController.getMetadata);

// Rutas de utilidad
router.get('/stats', PokemonController.getStats);
router.post('/cache/clear', PokemonController.clearCache);
router.get('/health', PokemonController.healthCheck);

export default router;