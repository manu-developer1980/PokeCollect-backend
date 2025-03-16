import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pokemonRoutes from "./routes/pokemon.routes";
import collectionsRoutes from "./routes/collections.routes";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: "*", // En producción, deberías especificar los orígenes permitidos
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Rutas
app.use("/api/pokemon", pokemonRoutes);
app.use("/api/collections", collectionsRoutes);

// Ruta de prueba
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API funcionando correctamente" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

export default app;
