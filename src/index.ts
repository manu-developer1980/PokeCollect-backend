import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { corsMiddleware } from "./middleware/corsMiddleware";
import pokemonRoutes from "./routes/pokemon";
import collectionRoutes from "./routes/collections";
import wishlistRoutes from "./routes/wishlist";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Aplicar el middleware CORS personalizado primero
app.use(corsMiddleware);

// Mantener la configuración CORS estándar como respaldo
app.use(cors());

app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// Rutas
app.use("/api/pokemon", pokemonRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/wishlist", wishlistRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Manejador de errores global
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something broke!" });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
