import { Router } from "express";
import * as pokemonController from "../controllers/pokemon.controller";

const router = Router();

// Rutas para la API de Pokémon
router.get("/cards", pokemonController.searchCards);
router.get("/cards/:id", pokemonController.getCardById);
router.get("/sets", pokemonController.getSets);
router.get("/types", pokemonController.getTypes);
router.get("/rarities", pokemonController.getRarities);

export default router;
