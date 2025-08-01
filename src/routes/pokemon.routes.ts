import { Router } from "express";
import * as pokemonController from "../controllers/pokemon.controller";
import { rateLimiters } from "../lib/rate-limiter";

const router = Router();

// Middleware específico para rutas Pokémon
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

// Aplicar rate limiting general a todas las rutas
router.use(rateLimiters.general.middleware());

// Rutas para la API de Pokémon con rate limiting específico
router.get("/cards", rateLimiters.pokemonSearch.middleware(), pokemonController.searchCards);
router.get("/cards/:id", pokemonController.getCardById);
router.get("/sets", rateLimiters.staticData.middleware(), pokemonController.getSets);
router.get("/types", rateLimiters.staticData.middleware(), pokemonController.getTypes);
router.get("/rarities", rateLimiters.staticData.middleware(), pokemonController.getRarities);

// Rutas administrativas para el caché
router.get("/cache/stats", pokemonController.getCacheStats);
router.delete("/cache", pokemonController.clearCache);

export default router;
