import { Router } from "express";
import * as collectionsController from "../controllers/collections.controller";

const router = Router();

// Rutas para colecciones
router.get("/", collectionsController.getCollections);
router.post("/:collectionId/cards", collectionsController.addCardToCollection);

export default router;
