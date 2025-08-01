import { Router } from "express";
import * as contactController from "../controllers/contact.controller";
import { rateLimiters } from "../lib/rate-limiter";

const router = Router();

// Middleware específico para rutas de contacto
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

// Ruta para enviar mensajes de contacto con rate limiting estricto
router.post("/send", rateLimiters.contact.middleware(), contactController.sendContactMessage);

export default router;