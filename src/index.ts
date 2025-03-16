import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import pokemonRoutes from "./routes/pokemon";
import collectionRoutes from "./routes/collections";
import wishlistRoutes from "./routes/wishlist";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS

app.use(cors());

// Middleware para manejar OPTIONS de manera explícita
app.options("*", (req, res) => {
  res.status(200).end();
});

app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// Normalizar rutas eliminando barras dobles
app.use((req, res, next) => {
  req.url = req.url.replace(/\/+/g, "/");
  next();
});

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
