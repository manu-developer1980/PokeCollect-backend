import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import pokemonRoutes from "./routes/pokemon.routes";
import collectionsRoutes from "./routes/collections.routes";
import contactRoutes from "./routes/contact.routes";
import stripeRoutes from "./routes/stripe.routes";
import brevoRoutes from "./routes/brevo.routes";

// Configurar dotenv para cargar desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Log para verificar que las variables de entorno se cargan correctamente
console.log('🔧 Variables de entorno cargadas:', {
  hasApiKey: !!process.env.POKEMON_TCG_API_KEY,
  apiKeyLength: process.env.POKEMON_TCG_API_KEY?.length || 0,
  port: process.env.PORT || 'default'
});

const app = express();
const PORT = process.env.PORT || 5174;

// Configuración de CORS mejorada
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como Postman) en desarrollo
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        "http://localhost:5173", // URL de desarrollo Vite
        "http://localhost:5174", // URL de desarrollo Vite alternativa
        "http://localhost:3000", // URL alternativa de desarrollo
        "https://poke-collector.netlify.app", // URL de producción
        "https://pokecollector.netlify.app", // URL alternativa de producción
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`CORS: Origin ${origin} not allowed`);
        callback(new Error('Not allowed by CORS'));
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
    maxAge: 86400, // Cache preflight requests for 24 hours
    optionsSuccessStatus: 200 // Para navegadores legacy
  })
);

app.use(express.json());

// Rutas
app.use("/api/pokemon", pokemonRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/brevo", brevoRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API funcionando correctamente" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
export default app;
