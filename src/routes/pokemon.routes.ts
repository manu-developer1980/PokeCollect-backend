import { Router } from "express";
import * as pokemonController from "../controllers/pokemon.controller";

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

// Rutas para la API de Pokémon
router.get("/cards", pokemonController.searchCards);
router.get("/cards/:id", pokemonController.getCardById);
router.get("/sets", pokemonController.getSets);
router.get("/types", pokemonController.getTypes);
router.get("/rarities", pokemonController.getRarities);

export default router;
