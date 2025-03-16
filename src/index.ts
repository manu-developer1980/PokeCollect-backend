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

// Lista de orígenes permitidos
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://poke-collect.vercel.app",
  // Añade aquí otros orígenes que necesites
];

// Configuración de CORS mejorada
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV !== "production"
      ) {
        callback(null, true);
      } else {
        callback(new Error("No permitido por CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

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
