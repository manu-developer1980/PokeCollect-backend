import express from "express";
import * as wishlistService from "../services/wishlistService.js";
import { validateAuth } from "../middleware/auth.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(validateAuth);

// También necesitamos arreglar el tipo Request para incluir user
// Añade esta interfaz al principio del archivo:
interface RequestWithUser extends express.Request {
  user?: any;
}

router.get("/", async (req: RequestWithUser, res) => {
  try {
    const wishlist = await wishlistService.getWishlistByUserId(req.user!.id);
    res.json({ data: wishlist });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

router.post("/", async (req: RequestWithUser, res) => {
  try {
    const card = await wishlistService.addToWishlist({
      ...req.body,
      user_id: req.user!.id,
    });
    res.status(201).json({ data: card });
  } catch (error) {
    res.status(500).json({ error: "Failed to add card to wishlist" });
  }
});

router.delete("/:cardId", async (req: RequestWithUser, res) => {
  try {
    await wishlistService.removeFromWishlist(req.user!.id, req.params.cardId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to remove card from wishlist" });
  }
});

router.put("/:cardId", async (req: RequestWithUser, res) => {
  try {
    const card = await wishlistService.updateWishlistCard(
      req.user!.id,
      req.params.cardId,
      req.body
    );
    res.json({ data: card });
  } catch (error) {
    res.status(500).json({ error: "Failed to update wishlist card" });
  }
});

export default router;
