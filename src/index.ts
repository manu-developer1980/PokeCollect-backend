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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 peticiones por ventana
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Rutas
app.use("/api/pokemon", pokemonRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/wishlist", wishlistRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
