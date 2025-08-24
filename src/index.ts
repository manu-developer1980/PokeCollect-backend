import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import pokemonRoutes from "./routes/pokemon.routes";
import autoUpdateRoutes from "./routes/auto-update.routes";
import imageRoutes from './routes/image-routes';
import sanityImageRoutes from './routes/sanity-image-routes';
import { localPokemonData } from './lib/local-pokemon-data';
import { autoUpdateService } from './lib/auto-update-service';
import collectionsRoutes from "./routes/collections.routes";
import contactRoutes from "./routes/contact.routes";
import stripeRoutes from "./routes/stripe.routes";
import brevoRoutes from "./routes/brevo.routes";

const app = express();
const PORT = process.env.PORT || 3000;

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
        callback(new Error("Not allowed by CORS"));
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
    optionsSuccessStatus: 200, // Para navegadores legacy
  })
);

// Configurar middleware para webhooks de Stripe (necesita body raw)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Configurar JSON parser para el resto de rutas
app.use(express.json());
app.use('/images', express.static('public/images'));

// Rutas
app.use("/api/pokemon", pokemonRoutes);
app.use("/api/auto-update", autoUpdateRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/brevo", brevoRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/sanity-images", sanityImageRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API funcionando correctamente" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Inicializar datos locales al arrancar
  localPokemonData.getSets('en').then(() => {
    console.log('✅ Local Pokemon data initialized');
    
    // Inicializar servicio de auto-update después de cargar los datos
    autoUpdateService.start();
    console.log('🚀 Auto-update service initialized');
  }).catch((error: any) => {
     console.error('❌ Failed to initialize local Pokemon data:', error);
   });
});
export default app;
