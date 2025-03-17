import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pokemonRoutes from "./routes/pokemon.routes";
import collectionsRoutes from "./routes/collections.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS más específica
app.use(
  cors({
    origin: [
      "http://localhost:5173", // URL de desarrollo
      "http://localhost:3000", // URL alternativa de desarrollo
      "https://poke-collector.netlify.app", // URL de producción (ajusta según tu dominio)
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);

app.use(express.json());

// Middleware para establecer headers CORS en todas las rutas
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Rutas
app.use("/api/pokemon", pokemonRoutes);
app.use("/api/collections", collectionsRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API funcionando correctamente" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
export default app;
